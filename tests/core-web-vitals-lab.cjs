const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { launchBrowser } = require("./browser-runtime.cjs");

const base = process.argv[2] || "http://127.0.0.1:8765";
const budget = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../performance-budget.json"), "utf8")).coreWebVitalsP75;
const pages = ["/", "/cases/", "/insights/", "/cases/kita.html", "/insights/angstfreie-organisationen.html"];

(async () => {
  const browser = await launchBrowser();
  const results = {};
  try {
    for (const pagePath of pages) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__labVitals = { lcp: 0, cls: 0 };
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length) window.__labVitals.lcp = entries[entries.length - 1].startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__labVitals.cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(new URL(pagePath, base).href, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const values = await page.evaluate(() => ({ ...window.__labVitals }));
      assert.ok(values.lcp <= budget.largestContentfulPaintMs, `${pagePath}: lab LCP ${values.lcp}ms exceeds ${budget.largestContentfulPaintMs}ms`);
      assert.ok(values.cls <= budget.cumulativeLayoutShift, `${pagePath}: lab CLS ${values.cls} exceeds ${budget.cumulativeLayoutShift}`);
      results[pagePath] = values;
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(results, null, 2));
  console.log("Local LCP/CLS lab thresholds passed. INP requires field monitoring or a representative interaction test.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
