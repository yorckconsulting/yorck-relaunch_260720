import assert from "node:assert/strict";

const base = new URL(process.argv[2] || "https://yorck-consulting.com");
const securityHeaders = {
  "content-security-policy": /frame-ancestors 'none'/,
  "strict-transport-security": /max-age=/,
  "x-content-type-options": /^nosniff$/,
  "x-frame-options": /^DENY$/
};
const checks = [
  { path: "/", status: 200, headers: securityHeaders },
  { path: "/home", status: 301, location: "/" },
  { path: "/home/", status: 301, location: "/" },
  { path: "/sitemap.xml", status: 200 },
  { path: "/robots.txt", status: 200 },
  { path: "/cases/kita.html", status: 200 },
  { path: "/insights/angstfreie-organisationen.html", status: 200 },
  { path: "/__monitoring-404-check__", status: 404, headers: securityHeaders },
  { path: "/_assets/__monitoring-retired-asset__.js", status: 410, headers: securityHeaders }
];

const failures = [];
for (const check of checks) {
  const url = new URL(check.path, base);
  try {
    const response = await fetch(url, { redirect: "manual", headers: { "user-agent": "yorck-production-monitor/1.0" } });
    assert.equal(response.status, check.status, `${url.href}: expected ${check.status}, got ${response.status}`);
    if (check.location) {
      const actual = new URL(response.headers.get("location"), url).pathname;
      assert.equal(actual, check.location, `${url.href}: expected redirect to ${check.location}, got ${actual}`);
    }
    for (const [name, expected] of Object.entries(check.headers || {})) {
      const actual = response.headers.get(name) || "";
      assert.match(actual, expected, `${url.href}: invalid or missing ${name}`);
    }
    console.log(`${response.status} ${url.pathname}${check.location ? ` -> ${check.location}` : ""}`);
  } catch (error) {
    failures.push(error.message);
    console.error(`FAIL ${url.pathname}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(`Production check failed (${failures.length}/${checks.length}).`);
  process.exitCode = 1;
} else {
  console.log("Production status and redirect checks passed.");
}
