import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { onRequest as oldAssetRequest } from "../functions/_assets/[[path]].js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deployRoot = path.join(root, ".pages-dist");
const productionOrigin = "https://yorck-consulting.com";

async function htmlFiles(directory = root) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    if (["functions", "tests", "node_modules", ".pages-dist"].includes(entry)) continue;
    const full = path.join(directory, entry);
    const info = await stat(full);
    if (info.isDirectory()) files.push(...await htmlFiles(full));
    else if (entry.endsWith(".html")) files.push(full);
  }
  return files;
}

function publicPath(file) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return "/" + relative.slice(0, -"index.html".length);
  return "/" + relative;
}

test("all internal links resolve and local fragments exist", async () => {
  for (const file of await htmlFiles()) {
    const html = await readFile(file, "utf8");
    const currentUrl = new URL(publicPath(file), productionOrigin);
    const links = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].map((match) => match[1]);
    for (const href of links) {
      if (/^(mailto:|tel:|https?:\/\/)/i.test(href)) continue;
      const target = new URL(href, currentUrl);
      assert.equal(target.origin, productionOrigin, `${publicPath(file)} links outside the production origin: ${href}`);
      let pathname = decodeURIComponent(target.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const targetFile = path.join(root, pathname.replace(/^\//, ""));
      const targetHtml = await readFile(targetFile, "utf8").catch(() => null);
      assert.notEqual(targetHtml, null, `${publicPath(file)} has a broken link: ${href}`);
      if (target.hash) {
        const id = target.hash.slice(1);
        assert.match(targetHtml, new RegExp(`\\bid=["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`), `${publicPath(file)} links to missing fragment: ${href}`);
      }
    }
  }
});

test("canonicals and sitemap use the production domain consistently", async () => {
  const files = (await htmlFiles()).filter((file) => path.basename(file) !== "404.html");
  const canonicalByPath = new Map();
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const matches = [...html.matchAll(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/gi)];
    assert.equal(matches.length, 1, `${publicPath(file)} must have one canonical`);
    const expected = productionOrigin + publicPath(file);
    assert.equal(matches[0][1], expected, `${publicPath(file)} has the wrong canonical`);
    canonicalByPath.set(publicPath(file), matches[0][1]);
  }

  const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.ok(locations.length > 0);
  for (const location of locations) {
    const url = new URL(location);
    assert.equal(url.origin, productionOrigin);
    assert.equal(canonicalByPath.get(url.pathname), location, `Sitemap URL has no matching canonical: ${location}`);
  }
  assert.doesNotMatch(sitemap, /\/home(?:<|\/)/);
});

test("migration rules, 404 and mailto contact are present", async () => {
  const redirects = await readFile(path.join(root, "_redirects"), "utf8");
  assert.match(redirects, /^\/home \/ 301$/m);
  assert.match(redirects, /^\/home\/ \/ 301$/m);

  const notFound = await readFile(path.join(root, "404.html"), "utf8");
  assert.match(notFound, /name="robots" content="noindex,follow"/);

  const home = await readFile(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(home, /<form\b/i, "index.html darf kein Kontaktformular mehr enthalten");
  assert.match(home, /href="mailto:info@yorck-consulting\.com"/);

  const gone = oldAssetRequest();
  assert.equal(gone.status, 410);
  assert.equal(gone.headers.get("X-Robots-Tag"), "noindex");
  assert.equal(gone.headers.get("X-Frame-Options"), "DENY");
  assert.equal(gone.headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(gone.headers.get("Content-Security-Policy"), /default-src 'none'/);
});

test("static security headers are complete and CSP permits only the current JSON-LD", async () => {
  const headers = await readFile(path.join(root, "_headers"), "utf8");
  assert.match(headers, /^\/\*$/m);
  for (const name of [
    "Content-Security-Policy",
    "Permissions-Policy",
    "Referrer-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options"
  ]) {
    assert.match(headers, new RegExp(`^  ${name}:`, "m"), `missing ${name}`);
  }
  const csp = headers.match(/^  Content-Security-Policy: (.+)$/m)?.[1] || "";
  for (const directive of [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ]) assert.match(csp, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const scriptDirective = csp.split(";").find((part) => part.trim().startsWith("script-src")) || "";
  assert.doesNotMatch(scriptDirective, /'unsafe-inline'/);
  assert.ok(headers.split(/\r?\n/).every((line) => line.length <= 2000), "_headers contains a line above Cloudflare's limit");

  for (const file of await htmlFiles()) {
    const html = await readFile(file, "utf8");
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    for (const [, attributes, source] of scripts) {
      if (/\bsrc=/i.test(attributes)) continue;
      assert.match(attributes, /type=["']application\/ld\+json["']/i, `${publicPath(file)} contains unexpected inline JavaScript`);
      const hash = createHash("sha256").update(source).digest("base64");
      assert.ok(csp.includes(`'sha256-${hash}'`), `${publicPath(file)} JSON-LD hash is missing from CSP`);
    }
  }
});

test("all pages provide the favicon and use unversioned source assets", async () => {
  for (const file of await htmlFiles()) {
    const html = await readFile(file, "utf8");
    assert.match(html, /<link\s+rel=["']icon["']\s+href=["'][^"']*assets\/img\/favicon\.svg["']/i, `${publicPath(file)} has no favicon`);
    assert.match(html, /href=["'][^"']*assets\/css\/styles\.css["']/i, `${publicPath(file)} has no source stylesheet`);
    assert.match(html, /src=["'][^"']*assets\/js\/main\.js["']/i, `${publicPath(file)} has no source script`);
    assert.doesNotMatch(html, /(?:styles\.css|main\.js)\?v=/i, `${publicPath(file)} contains a manual CSS/JS revision`);
  }
});

test("all sitemap pages provide complete and current social metadata", async () => {
  const registry = JSON.parse(await readFile(path.join(root, "content", "social-pages.json"), "utf8"));
  const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
  const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname).sort();
  assert.deepEqual(registry.pages.map((page) => page.path).sort(), sitemapPaths, "social registry must match the sitemap exactly");

  const socialImages = new Set();
  for (const page of registry.pages) {
    const html = await readFile(path.join(root, page.file), "utf8");
    const canonical = getMeta(html, "link", "canonical", page.file);
    const description = getMeta(html, "name", "description", page.file);
    const og = Object.fromEntries([
      "type", "locale", "site_name", "title", "description", "url", "image", "image:secure_url",
      "image:type", "image:width", "image:height", "image:alt"
    ].map((name) => [name, getMeta(html, "property", `og:${name}`, page.file)]));
    const twitter = Object.fromEntries([
      "card", "title", "description", "image", "image:alt"
    ].map((name) => [name, getMeta(html, "name", `twitter:${name}`, page.file)]));

    assert.equal(canonical, registry.origin + page.path);
    assert.equal(og.type, page.type);
    assert.equal(og.locale, registry.locale);
    assert.equal(og.site_name, registry.siteName);
    assert.equal(og.description, description);
    assert.equal(og.url, canonical);
    assert.equal(og.image, `${registry.origin}/assets/img/social/${page.image}`);
    assert.equal(og["image:secure_url"], og.image);
    assert.equal(og["image:type"], "image/png");
    assert.equal(og["image:width"], "1200");
    assert.equal(og["image:height"], "630");
    assert.equal(og["image:alt"], page.imageAlt);
    assert.equal(twitter.card, "summary_large_image");
    assert.equal(twitter.title, og.title);
    assert.equal(twitter.description, og.description);
    assert.equal(twitter.image, og.image);
    assert.equal(twitter["image:alt"], og["image:alt"]);
    assert.doesNotMatch(html, /name=["']twitter:site["']/i, `${page.file} must not invent a social account`);

    const imageFile = path.join(root, "assets", "img", "social", page.image);
    const metadata = await sharp(imageFile).metadata();
    assert.equal(metadata.format, "png", `${page.image} must be a PNG`);
    assert.equal(metadata.width, 1200, `${page.image} has the wrong width`);
    assert.equal(metadata.height, 630, `${page.image} has the wrong height`);
    socialImages.add(page.image);
  }

  const generated = (await readdir(path.join(root, "assets", "img", "social"))).filter((file) => file.endsWith(".png"));
  assert.deepEqual(generated.sort(), [...socialImages].sort(), "generated social cards must match the registry exactly");

  for (const file of ["404.html", "impressum.html", "datenschutz.html"]) {
    const html = await readFile(path.join(root, file), "utf8");
    assert.doesNotMatch(html, /(?:property=["']og:|name=["']twitter:)/i, `${file} must not contain social metadata`);
  }
});

test("the Pages artifact uses content-hashed CSS and JavaScript", async () => {
  const assets = [
    { directory: "css", source: "styles.css" },
    { directory: "js", source: "main.js" }
  ].map((asset) => {
    const source = path.join(root, "assets", asset.directory, asset.source);
    assert.equal(existsSync(source), true, `missing source asset: ${asset.source}`);
    const hash = createHash("sha256").update(readFileSync(source)).digest("hex").slice(0, 12);
    const parsed = path.parse(asset.source);
    return { ...asset, filename: `${parsed.name}.${hash}${parsed.ext}` };
  });

  for (const asset of assets) {
    assert.equal(existsSync(path.join(deployRoot, "assets", asset.directory, asset.filename)), true, `missing ${asset.filename}`);
    assert.equal(existsSync(path.join(deployRoot, "assets", asset.directory, asset.source)), false, `unhashed ${asset.source} must not be deployed`);
  }

  for (const file of await htmlFiles(deployRoot)) {
    const html = await readFile(file, "utf8");
    for (const asset of assets) {
      assert.match(html, new RegExp(`assets/${asset.directory}/${asset.filename.replaceAll(".", "\\.")}`), `${path.relative(deployRoot, file)} has the wrong ${asset.directory} revision`);
    }
    assert.doesNotMatch(html, /(?:styles\.css|main\.js)(?:\?v=\d+)?["']/i, `${path.relative(deployRoot, file)} references an unhashed asset`);
  }
});

test("runtime assets are referenced and local metadata files are absent", async () => {
  const textExtensions = new Set([".cjs", ".css", ".html", ".js", ".json", ".jsonc", ".md", ".mjs", ".py", ".txt", ".xml"]);
  const sourceFiles = await filesRecursively(root, (file) => textExtensions.has(path.extname(file)));
  const corpus = (await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")))).join("\n");

  for (const assetDirectory of [path.join(root, "assets", "fonts"), path.join(root, "assets", "img")]) {
    for (const file of await filesRecursively(assetDirectory, () => true)) {
      const filename = path.basename(file);
      assert.ok(corpus.includes(filename), `unreferenced runtime asset: ${path.relative(root, file)}`);
    }
  }

  const metadata = await filesRecursively(root, (file) => path.basename(file) === ".DS_Store");
  assert.deepEqual(metadata, [], "local .DS_Store files must not be part of the project");
});

test("Wrangler uses the pinned Pages compatibility configuration", async () => {
  const config = JSON.parse(await readFile(path.join(root, "wrangler.jsonc"), "utf8"));
  assert.equal(config.compatibility_date, "2026-07-15");
  assert.equal(config.pages_build_output_dir, ".pages-dist");
});

async function filesRecursively(directory, include) {
  const files = [];
  for (const entry of await readdir(directory)) {
    if (["node_modules", ".pages-dist", ".wrangler"].includes(entry)) continue;
    const full = path.join(directory, entry);
    const info = await stat(full);
    if (info.isDirectory()) files.push(...await filesRecursively(full, include));
    else if (include(full)) files.push(full);
  }
  return files;
}

function getMeta(html, attribute, name, file) {
  let expression;
  if (attribute === "link") {
    expression = new RegExp(`<link\\s+rel=["']${name}["']\\s+href=["']([^"']+)["']`, "gi");
  } else {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expression = new RegExp(`<meta\\s+${attribute}=["']${escapedName}["']\\s+content=["']([^"']+)["']`, "gi");
  }
  const matches = [...html.matchAll(expression)];
  assert.equal(matches.length, 1, `${file} must contain exactly one ${name}`);
  return matches[0][1];
}
