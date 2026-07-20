import assert from "node:assert/strict";

if (!process.argv[2]) throw new Error("Usage: node tests/pages-smoke.mjs http://127.0.0.1:8788");
const base = new URL(process.argv[2]);

async function load(path, options = {}) {
  return fetch(new URL(path, base), { redirect: "manual", ...options });
}

for (const path of ["/"]) {
  const response = await load(path);
  assert.equal(response.status, 200, `${path} must be served`);
  assert.match(response.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
}

for (const path of ["/home", "/home/"]) {
  const response = await load(path);
  assert.equal(response.status, 301, `${path} must redirect permanently`);
  assert.equal(new URL(response.headers.get("location"), base).pathname, "/");
}

const missing = await load("/__pages-smoke-missing__");
assert.equal(missing.status, 404);
assert.equal(missing.headers.get("x-content-type-options"), "nosniff");
assert.equal(missing.headers.get("x-frame-options"), "DENY");
assert.match(await missing.text(), /Seite nicht gefunden/);

const gone = await load("/_assets/retired-canva-file.js");
assert.equal(gone.status, 410);
assert.equal(gone.headers.get("x-robots-tag"), "noindex");
assert.equal(gone.headers.get("x-frame-options"), "DENY");

console.log("Cloudflare Pages routes, redirects and headers smoke checks passed.");
