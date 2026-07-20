const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { launchBrowser } = require("./browser-runtime.cjs");

const base = process.argv[2] || "http://127.0.0.1:8765";
const budget = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../performance-budget.json"), "utf8"));
const profiles = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 }
};

function totals(resources) {
  const unique = [...new Map(resources.map((item) => [item.url, item])).values()];
  return {
    totalBytes: unique.reduce((sum, item) => sum + item.bytes, 0),
    imageBytes: unique.filter((item) => item.type === "image").reduce((sum, item) => sum + item.bytes, 0),
    requests: unique.length
  };
}

function enforce(actual, limit, label, resources = []) {
  const largest = [...resources].sort((a, b) => b.bytes - a.bytes).slice(0, 8).map((item) => `${item.bytes}:${new URL(item.url).pathname}`).join(", ");
  for (const key of Object.keys(limit)) assert.ok(actual[key] <= limit[key], `${label}: ${key} ${actual[key]} exceeds ${limit[key]}; largest: ${largest}`);
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(320, Math.floor(innerHeight * 0.75))) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 45));
    }
  });
  await page.waitForTimeout(350);
}

(async () => {
  const browser = await launchBrowser();
  const report = {};
  try {
    for (const [groupName, group] of Object.entries(budget.pages)) {
      for (const [profileName, viewport] of Object.entries(profiles)) {
        for (const pagePath of group.paths) {
          const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
          const page = await context.newPage();
          const resources = [];
          page.on("response", async (response) => {
            if (!response.ok() || response.request().method() !== "GET") return;
            const headers = await response.allHeaders();
            resources.push({ url: response.url(), type: response.request().resourceType(), bytes: Number(headers["content-length"] || 0) });
          });
          await page.goto(new URL(pagePath, base).href, { waitUntil: "networkidle" });
          const initial = totals(resources);
          enforce(initial, group[profileName].initial, `${groupName} ${profileName} ${pagePath} initial`, resources);

          const missingDimensions = await page.locator("img").evaluateAll((images) => images.filter((image) => !image.hasAttribute("width") || !image.hasAttribute("height")).map((image) => image.currentSrc || image.src));
          assert.deepEqual(missingDimensions, [], `${pagePath} contains images without dimensions`);

          const result = { initial };
          if (group[profileName].fullScroll) {
            await scrollThrough(page);
            result.fullScroll = totals(resources);
            enforce(result.fullScroll, group[profileName].fullScroll, `${groupName} ${profileName} ${pagePath} fullScroll`, resources);
            if (profileName === "mobile") {
              assert.equal(resources.filter((item) => /\/about-(?:founders|map|compass|statue|champagne|portrait|facade|espresso)[-.]/.test(item.url)).length, 0, "About collage assets loaded on mobile");
            }
          }
          report[`${groupName}:${profileName}:${pagePath}`] = result;
          await context.close();
        }
      }
    }

    for (const width of [1120, 1121]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
      const page = await context.newPage();
      const aboutRequests = [];
      page.on("request", (request) => {
        if (/\/about-(?:founders|map|compass|statue|champagne|portrait|facade|espresso)[-.]/.test(request.url())) aboutRequests.push(request.url());
      });
      await page.goto(new URL("/", base).href, { waitUntil: "networkidle" });
      await scrollThrough(page);
      assert.equal(aboutRequests.length > 0, width === 1121, `${width}px About asset loading does not match the 1120/1121 breakpoint`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  console.log("Performance budgets passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
