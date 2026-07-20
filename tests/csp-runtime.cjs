const assert = require("node:assert/strict");
const { launchBrowser } = require("./browser-runtime.cjs");

const base = process.env.BASE_URL || process.argv[2];
if (!base) throw new Error("Usage: node tests/csp-runtime.cjs http://127.0.0.1:8788");

(async () => {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    for (const path of ["/", "/cases/", "/insights/", "/cases/kita.html", "/insights/angstfreie-organisationen.html"]) {
      const page = await context.newPage();
      const consoleViolations = [];
      page.on("console", (message) => {
        if (/content security policy|refused to/i.test(message.text())) consoleViolations.push(message.text());
      });
      await page.addInitScript(() => {
        window.__cspViolations = [];
        document.addEventListener("securitypolicyviolation", (event) => {
          window.__cspViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI });
        });
      });
      const response = await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, `${path} must load`);
      assert.match(response.headers()["content-security-policy"] || "", /script-src 'self'/);
      assert.deepEqual(await page.evaluate(() => window.__cspViolations), [], `${path} triggered CSP violations`);
      assert.deepEqual(consoleViolations, [], `${path} logged CSP violations`);
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains("js")), true, `${path} main script did not execute`);
      assert.equal(await page.locator("link[rel=stylesheet]").count() > 0, true);
      await page.close();
    }
    await context.close();
    console.log("Enforced CSP loads all page types without violations.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
