const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { launchBrowser } = require("./browser-runtime.cjs");

const outputDir = path.resolve(process.argv[2] || "/tmp/yorck-visual");
const base = process.argv[3] || "http://127.0.0.1:8765/";
const profiles = [
  { name: "desktop", viewport: { width: 1440, height: 1000 } },
  { name: "mobile", viewport: { width: 390, height: 844 } }
];

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(320, Math.floor(innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 45));
    }
    scrollTo(0, 0);
  });
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await launchBrowser();
  const report = {};
  try {
    for (const profile of profiles) {
      const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
      const page = await context.newPage();
      const resources = [];
      page.on("response", async (response) => {
        const request = response.request();
        if (!response.ok() || request.method() !== "GET") return;
        const headers = await response.allHeaders();
        const declared = Number(headers["content-length"] || 0);
        resources.push({ url: response.url(), type: request.resourceType(), bytes: declared });
      });
      await page.goto(base, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const initiallyLoaded = resources.slice();
      await scrollThrough(page);
      await page.waitForTimeout(400);
      await page.addStyleTag({ content: `
        *, *::before, *::after { animation: none !important; transition: none !important; }
        .js [data-reveal], .js [data-reveal] > span { opacity: 1 !important; transform: none !important; }
        .marquee__track { transform: none !important; }
      ` });
      await page.screenshot({ path: path.join(outputDir, `${profile.name}.png`), fullPage: true });
      const dedupe = (items) => [...new Map(items.map((item) => [item.url, item])).values()];
      const summarize = (items) => {
        const unique = dedupe(items);
        return {
          bytes: unique.reduce((sum, item) => sum + item.bytes, 0),
          imageBytes: unique.filter((item) => item.type === "image").reduce((sum, item) => sum + item.bytes, 0),
          requests: unique.length,
          images: unique.filter((item) => item.type === "image").length,
          resources: unique.sort((a, b) => b.bytes - a.bytes)
        };
      };
      report[profile.name] = {
        initial: summarize(initiallyLoaded),
        fullScroll: summarize(resources),
        document: await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))
      };
      assert.ok(report[profile.name].document.width <= profile.viewport.width, `${profile.name} has horizontal overflow`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(outputDir, "network.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    desktop: { initial: report.desktop.initial, fullScroll: report.desktop.fullScroll },
    mobile: { initial: report.mobile.initial, fullScroll: report.mobile.fullScroll }
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
