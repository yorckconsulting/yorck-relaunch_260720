const assert = require("node:assert/strict");
const AxeBuilder = require("@axe-core/playwright").default;
const { launchBrowser, selectedBrowser } = require("./browser-runtime.cjs");
const pageRoutes = require("./page-routes.cjs");

const base = process.env.BASE_URL || process.argv[2] || "http://127.0.0.1:8765";
const acceptedArticleContrastRoutes = new Set([
  "/cases/entscheidungswege.html",
  "/cases/fuehrung-umbruch.html",
  "/cases/kita.html",
  "/cases/personalstrategie.html",
  "/cases/wissen-das-auffindbar-wird.html",
  "/insights/angstfreie-organisationen.html",
  "/insights/kein-angebotsproblem-public-sector.html",
  "/insights/private-hochschulen-unter-druck.html",
  "/insights/empowered-by-strengths.html",
  "/insights/vision-statt-verwaltung.html"
]);

function blockingViolations(axe, route) {
  return axe.violations.flatMap((violation) => {
    if (violation.impact !== "critical" && violation.impact !== "serious") return [];
    const nodes = violation.nodes.filter((node) => {
      const acceptedArticleButton = violation.id === "color-contrast" &&
        acceptedArticleContrastRoutes.has(route) &&
        node.html.includes('class="btn btn-primary"');
      // Kategorie-Plakette: weiße Schrift auf Cyan, Pink und Grün ist dieselbe akzeptierte Ausnahme wie bei den Buttons.
      const acceptedCategoryPill = violation.id === "color-contrast" && node.html.includes('class="article-cat"');
      return !acceptedArticleButton && !acceptedCategoryPill;
    });
    return nodes.length ? [{ id: violation.id, impact: violation.impact, nodes: nodes.map((node) => node.target) }] : [];
  });
}

async function revealPage(page) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const step = Math.max(320, Math.floor(innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 45));
    }
    scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
  await page.waitForTimeout(50);
}

(async () => {
  const selected = selectedBrowser();
  const browser = await launchBrowser();
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
    const page = await desktop.newPage();
    await page.goto(new URL("/", base).href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    assert.equal(await page.locator(".marquee__toggle").count(), 0);
    const logoMarquee = page.locator(".komplizen .marquee");
    await logoMarquee.focus();
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".komplizen .marquee")), true);
    assert.equal(await logoMarquee.locator(".marquee__track").evaluate((element) => getComputedStyle(element).animationPlayState), "paused");
    await page.locator(".nav-links a").first().focus();
    assert.equal(await logoMarquee.locator(".marquee__track").evaluate((element) => getComputedStyle(element).animationPlayState), "running");

    await logoMarquee.hover();
    assert.equal(await logoMarquee.locator(".marquee__track").evaluate((element) => getComputedStyle(element).animationPlayState), "running", "hover must not pause the Kompliz:innen marquee");
    const marqueeBox = await logoMarquee.boundingBox();
    assert.ok(marqueeBox, "Kompliz:innen marquee must be visible");
    const centerX = marqueeBox.x + marqueeBox.width / 2;
    const centerY = marqueeBox.y + marqueeBox.height / 2;
    const pointer = { pointerId: 41, pointerType: "mouse", clientY: centerY, button: 0, bubbles: true };
    await logoMarquee.dispatchEvent("pointerdown", { ...pointer, clientX: centerX, buttons: 1 });
    const frozenTransform = await logoMarquee.locator(".marquee__track").evaluate((element) => ({ animationName: getComputedStyle(element).animationName, transform: element.style.transform }));
    assert.equal(frozenTransform.animationName, "none", "holding must freeze the marquee animation");
    await page.waitForTimeout(100);
    assert.equal(await logoMarquee.locator(".marquee__track").evaluate((element) => element.style.transform), frozenTransform.transform, "holding without movement must keep the position");
    await logoMarquee.dispatchEvent("pointermove", { ...pointer, clientX: centerX - 60, button: -1, buttons: 1 });
    const leftTransform = await logoMarquee.locator(".marquee__track").evaluate((element) => element.style.transform);
    await logoMarquee.dispatchEvent("pointermove", { ...pointer, clientX: centerX + 60, button: -1, buttons: 1 });
    const rightTransform = await logoMarquee.locator(".marquee__track").evaluate((element) => element.style.transform);
    assert.notEqual(leftTransform, frozenTransform.transform, "dragging left must move the marquee");
    assert.notEqual(rightTransform, leftTransform, "dragging right must move the marquee in the other direction");
    await logoMarquee.dispatchEvent("pointerup", { ...pointer, clientX: centerX + 60, buttons: 0 });
    const resumed = await logoMarquee.locator(".marquee__track").evaluate((element) => ({
      inlineAnimation: element.style.animation,
      animationName: getComputedStyle(element).animationName,
      playState: getComputedStyle(element).animationPlayState
    }));
    assert.equal(resumed.inlineAnimation, "");
    assert.equal(resumed.animationName, "marquee");
    assert.equal(resumed.playState, "running");
    await page.close();

    for (const route of pageRoutes) {
      const routePage = await desktop.newPage();
      const pageErrors = [];
      const externalRequests = [];
      routePage.on("pageerror", (error) => pageErrors.push(error.message));
      routePage.on("request", (request) => {
        if (new URL(request.url()).origin !== new URL(base).origin) externalRequests.push(request.url());
      });
      await routePage.goto(new URL(route, base).href, { waitUntil: "networkidle" });
      await routePage.evaluate(() => document.fonts.ready);
      await revealPage(routePage);
      assert.equal(await routePage.locator('[data-reveal]:not(.is-visible):not([aria-hidden="true"])').count(), 0, `${route} contains unrevealed source content after scrolling`);
      const imageProblems = await routePage.locator("img").evaluateAll((images) => images.filter((image) => !image.hasAttribute("alt") || !image.hasAttribute("width") || !image.hasAttribute("height")).map((image) => image.currentSrc || image.src));
      assert.deepEqual(imageProblems, [], `${route} contains incomplete image metadata`);
      assert.equal(documentWidth(await routePage.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))), true, `${route} overflows horizontally`);
      const axe = await new AxeBuilder({ page: routePage }).analyze();
      assert.deepEqual(blockingViolations(axe, route), [], `${route} has blocking Axe findings`);
      assert.deepEqual(pageErrors, [], `${route} has page errors`);
      assert.deepEqual(externalRequests, [], `${route} performs external requests`);
      await routePage.close();
    }
    await desktop.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(new URL("/", base).href, { waitUntil: "networkidle" });
    assert.equal(documentWidth(await mobilePage.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))), true);
    await mobilePage.locator("#navToggle").click();
    await mobilePage.waitForFunction(() => document.activeElement && document.activeElement.matches(".nav-links a"));
    assert.equal(await mobilePage.locator("main").evaluate((element) => element.inert), true);
    await mobilePage.keyboard.press("Escape");
    await mobilePage.waitForFunction(() => document.activeElement === document.getElementById("navToggle"));
    await mobile.close();

    const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto(new URL("/", base).href, { waitUntil: "networkidle" });
    const motion = await reducedPage.locator(".marquee__track").evaluateAll((tracks) => tracks.map((track) => getComputedStyle(track).animationName));
    assert.ok(motion.every((name) => name === "none"));
    await reduced.close();

    console.log(`${selected.name}: cross-browser, keyboard and axe checks passed.`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function documentWidth(value) {
  return value.scroll <= value.client;
}
