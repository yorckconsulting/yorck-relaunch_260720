const assert = require("node:assert/strict");
const { launchBrowser } = require("./browser-runtime.cjs");
const pageRoutes = require("./page-routes.cjs");

const base = process.env.BASE_URL || process.argv[2] || "http://127.0.0.1:8765";

async function metrics(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const viewport = document.documentElement.clientWidth;
    const widthWithout = (selector) => {
      const nodes = [...document.querySelectorAll(selector)];
      const displays = nodes.map((el) => el.style.display);
      nodes.forEach((el) => { el.style.display = "none"; });
      const width = document.documentElement.scrollWidth;
      nodes.forEach((el, index) => { el.style.display = displays[index]; });
      return width;
    };
    const rect = (selector) => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width };
    };
    return {
      viewport,
      scrollWidth: document.documentElement.scrollWidth,
      widthWithoutMarquees: widthWithout(".marquee"),
      widthWithoutHero: widthWithout(".hero"),
      bodyOverflowX: getComputedStyle(document.body).overflowX,
      title: rect(".hero .display"),
      subline: rect(".hero__sub"),
      offenders: [...document.querySelectorAll("body *")].filter((el) => !el.closest(".marquee") && !el.matches(".hero__lamp") && !el.closest("[data-parallax-img]")).map((el) => {
        const box = el.getBoundingClientRect();
        return { tag: el.tagName, className: typeof el.className === "string" ? el.className : "", text: (el.textContent || "").trim().slice(0, 40), left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width) };
      }).filter((item) => item.left < -1 || item.right > viewport + 1).sort((a, b) => b.right - a.right).slice(0, 20),
      internalOverflow: [...document.querySelectorAll("body *")].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => ({
        tag: el.tagName,
        className: typeof el.className === "string" ? el.className : "",
        text: (el.textContent || "").trim().slice(0, 40),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        overflowX: getComputedStyle(el).overflowX
      })).sort((a, b) => b.scrollWidth - a.scrollWidth).slice(0, 25)
    };
  });
}

(async () => {
  const browser = await launchBrowser();
  try {
    for (const width of [320, 360, 390, 430]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      await page.goto(base + "/", { waitUntil: "networkidle" });
      const result = await metrics(page);
      assert.equal(result.bodyOverflowX, "visible", `${width}px must not hide page overflow`);
      assert.ok(result.scrollWidth <= result.viewport, `${width}px has horizontal overflow: ${JSON.stringify(result)}`);
      assert.ok(result.title.left >= 0 && result.title.right <= result.viewport, `${width}px title is clipped`);
      assert.ok(result.subline.left >= 0 && result.subline.right <= result.viewport, `${width}px subline is clipped`);
      await context.close();
    }

    for (const route of pageRoutes) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(new URL(route, base).href, { waitUntil: "networkidle" });
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
        bodyOverflowX: getComputedStyle(document.body).overflowX
      }));
      assert.equal(dimensions.bodyOverflowX, "visible", `${route} must not hide horizontal overflow`);
      assert.ok(dimensions.scrollWidth <= dimensions.viewport, `${route} has mobile horizontal overflow: ${JSON.stringify(dimensions)}`);
      await context.close();
    }

    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(base + "/", { waitUntil: "networkidle" });
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      const result = await metrics(page);
      assert.ok(result.scrollWidth <= result.viewport, `200% text has horizontal overflow: ${JSON.stringify(result)}`);
      assert.ok(result.title.left >= 0 && result.title.right <= result.viewport, "200% text clips the title");
      assert.ok(result.subline.left >= 0 && result.subline.right <= result.viewport, "200% text clips the subline");

      await page.locator("#navToggle").click();
      assert.equal(await page.locator("#navToggle").getAttribute("aria-expanded"), "true");
      await page.waitForFunction(() => document.activeElement && document.activeElement.matches(".nav-links a"));
      assert.equal(await page.evaluate(() => document.activeElement.matches(".nav-links a")), true, "focus must enter the menu");
      assert.equal(await page.locator("main").evaluate((el) => el.inert), true);
      assert.equal(await page.locator(".site-footer").evaluate((el) => el.inert), true);
      await page.locator("#navToggle").focus();
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.matches(".nav-links a")), true, "Tab must wrap inside the menu");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement === document.getElementById("navToggle"));
      assert.equal(await page.locator("main").evaluate((el) => el.inert), false);
      await context.close();
    }

    for (const route of pageRoutes.filter((route) => route !== "/")) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(new URL(route, base).href, { waitUntil: "networkidle" });
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth
      }));
      assert.ok(dimensions.scrollWidth <= dimensions.viewport, `${route} overflows at 200% text: ${JSON.stringify(dimensions)}`);
      await context.close();
    }

    {
      const context = await browser.newContext({ viewport: { width: 720, height: 400 } });
      const page = await context.newPage();
      await page.goto(base + "/", { waitUntil: "networkidle" });
      await page.locator("#navToggle").click();
      assert.equal(await page.locator("#nav").evaluate((el) => getComputedStyle(el).overflowY), "auto");
      await context.close();
    }

    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto(base + "/", { waitUntil: "networkidle" });
      const reduced = await page.evaluate(() => ({
        animations: [...document.querySelectorAll(".marquee__track")].map((el) => getComputedStyle(el).animationName),
        overflow: [...document.querySelectorAll(".marquee")].map((el) => getComputedStyle(el).overflowX)
      }));
      assert.ok(reduced.animations.every((value) => value === "none"));
      assert.equal(await page.locator(".marquee__toggle").count(), 0);
      assert.ok(reduced.overflow.every((value) => value === "auto"));
      await context.close();
    }

    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      await page.goto(base + "/", { waitUntil: "networkidle" });
      assert.equal(await page.locator(".marquee__toggle").count(), 0);
      const firstMarquee = page.locator(".marquee").first();
      await firstMarquee.hover();
      assert.equal(await firstMarquee.locator(".marquee__track").evaluate((el) => getComputedStyle(el).animationPlayState), "paused");
      await page.mouse.move(0, 0);
      assert.equal(await firstMarquee.locator(".marquee__track").evaluate((el) => getComputedStyle(el).animationPlayState), "running");

      await page.locator(".seg").nth(2).focus();
      await page.keyboard.press("Space");
      const selected = await page.locator(".seg").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-pressed")));
      assert.deepEqual(selected, ["false", "false", "true", "false"]);
      await context.close();
    }

    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(base + "/", { waitUntil: "load" });
      const mailLink = await page.locator(".contact__email").getAttribute("href");
      assert.equal(mailLink, "mailto:info@yorck-consulting.com");
      assert.equal(await page.locator(".marquee__toggle").count(), 0);
      assert.ok((await page.locator(".marquee").first().evaluate((el) => getComputedStyle(el).overflowX)) === "auto");
      await context.close();
    }

    console.log("Mobile, accessibility and reduced-motion checks passed.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
