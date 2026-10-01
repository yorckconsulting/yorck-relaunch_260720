const assert = require("node:assert/strict");
const { launchBrowser, selectedBrowser } = require("./browser-runtime.cjs");

const base = process.env.BASE_URL || process.argv[2] || "http://127.0.0.1:8765";
const strips = ["cases", "insights", "team"];
const viewports = [
  { name: "desktop", options: { viewport: { width: 1440, height: 900 } } },
  { name: "mobile", options: { viewport: { width: 390, height: 844 }, ...(selectedBrowser().name === "chromium" ? { hasTouch: true, isMobile: true } : {}) } },
  { name: "reduced-motion", options: { viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" } }
];

async function scrollLeft(page, id) {
  return page.locator(`#${id} .strip__track`).evaluate((el) => Math.round(el.scrollLeft));
}

async function waitFor(page, id, predicate, message) {
  try {
    await page.waitForFunction(
      ([selector, source]) => new Function("track", `return (${source})(track)`)(document.querySelector(selector)),
      [`#${id} .strip__track`, predicate],
      { timeout: 5000 }
    );
  } catch {
    assert.fail(message);
  }
}

(async () => {
  for (const viewport of viewports) {
    // pro Szenario ein frischer Browser: der WebKit-Build von Playwright stürzt sonst beim Kontextwechsel ab
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext(viewport.options);
      const page = await context.newPage();
      await page.goto(base + "/", { waitUntil: "networkidle" });
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });

      for (const id of strips) {
        const label = `${selectedBrowser().name} ${viewport.name} #${id}`;
        if (process.env.DEBUG_STRIPS) console.log("start", label);
        const track = page.locator(`#${id} .strip__track`);
        await track.scrollIntoViewIfNeeded();

        const setup = await track.evaluate((el) => ({
          animation: getComputedStyle(el).animationName,
          overflowX: getComputedStyle(el).overflowX,
          tabindex: el.getAttribute("tabindex"),
          name: el.getAttribute("aria-label"),
          items: el.children.length
        }));
        assert.equal(setup.animation, "none", `${label}: no auto-scroll animation`);
        assert.equal(setup.overflowX, "auto", `${label}: native horizontal scrolling`);
        assert.equal(setup.tabindex, "0", `${label}: scroll region must be keyboard focusable`);
        assert.ok(setup.name, `${label}: scroll region needs an accessible name`);

        const prev = page.locator(`#${id} .strip__btn`).first();
        const next = page.locator(`#${id} .strip__btn`).last();
        assert.equal(await prev.getAttribute("aria-label"), "Zurück");
        assert.equal(await next.getAttribute("aria-label"), "Weiter");
        assert.equal(await prev.isDisabled(), true, `${label}: previous disabled at the start`);
        assert.equal(await page.locator(`#${id} .strip__count`).textContent(), `1 / ${setup.items}`);
        const box = await next.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44, `${label}: arrow target at least 44 px`);

        const peek = await track.evaluate((el) => [...el.children].some((item) => {
          const rect = item.getBoundingClientRect();
          return rect.left > 0 && rect.left < innerWidth && rect.right > innerWidth + 8;
        }));
        assert.ok(peek, `${label}: the next item must peek into the viewport`);

        const start = await scrollLeft(page, id);
        await next.click();
        await waitFor(page, id, `(track) => track.scrollLeft > ${start} + 20`, `${label}: next arrow must scroll`);
        await page.waitForFunction((name) => !document.querySelector(`#${name} .strip__btn`).disabled, id, { timeout: 3000 })
          .catch(() => assert.fail(`${label}: previous enabled after scrolling`));
        const afterNext = await scrollLeft(page, id);
        await prev.click();
        await waitFor(page, id, `(track) => track.scrollLeft < ${afterNext} - 20`, `${label}: previous arrow must scroll back`);

        for (let i = 0; i < 40 && !(await next.isDisabled()); i += 1) {
          await next.click();
          await page.waitForTimeout(viewport.name === "reduced-motion" ? 60 : 450);
        }
        await waitFor(page, id, "(track) => track.scrollLeft >= track.scrollWidth - track.clientWidth - 2", `${label}: arrows must reach the end`);
        await page.waitForFunction((name) => document.querySelectorAll(`#${name} .strip__btn`)[1].disabled, id, { timeout: 3000 })
          .catch(() => assert.fail(`${label}: next disabled at the end`));
        assert.equal(await page.locator(`#${id} .strip__count`).textContent(), `${setup.items} / ${setup.items}`);

        if (viewport.name !== "mobile") {
          await track.evaluate((el) => { el.scrollLeft = 0; });
          await track.focus();
          await page.keyboard.press("ArrowRight");
          await waitFor(page, id, "(track) => track.scrollLeft > 20", `${label}: arrow key must scroll the focused region`);
          await track.evaluate((el) => { el.scrollLeft = 0; });
          await track.hover();
          await page.mouse.wheel(500, 0);
          await waitFor(page, id, "(track) => track.scrollLeft > 20", `${label}: horizontal wheel/trackpad must scroll`);
        }
      }

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `${viewport.name}: page must not scroll horizontally (overflow ${overflow}px)`);
      await context.close();
    } finally {
      await browser.close().catch(() => {});
    }
  }
  console.log(`${selectedBrowser().name}: scroll-snap strips (arrows, counter, keyboard, wheel, peek) passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
