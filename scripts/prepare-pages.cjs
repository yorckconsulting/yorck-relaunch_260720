const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const output = path.join(root, ".pages-dist");
const entries = [
  "404.html",
  "_headers",
  "_redirects",
  "assets",
  "cases",
  "datenschutz.html",
  "impressum.html",
  "index.html",
  "insights",
  "robots.txt",
  "sitemap.xml"
];

execFileSync(process.execPath, [path.join(root, "scripts", "social-metadata.cjs"), "--check"], {
  cwd: root,
  stdio: "inherit"
});

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const entry of entries) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) throw new Error(`Missing deployable entry: ${entry}`);
  fs.cpSync(source, path.join(output, entry), { recursive: true });
}

function contentHash(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 12);
}

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

const revisions = [
  { directory: "css", source: "styles.css" },
  { directory: "js", source: "main.js" }
].map((asset) => {
  const source = path.join(output, "assets", asset.directory, asset.source);
  const parsed = path.parse(asset.source);
  const filename = `${parsed.name}.${contentHash(source)}${parsed.ext}`;
  fs.renameSync(source, path.join(path.dirname(source), filename));
  return { ...asset, filename };
});

for (const file of htmlFiles(output)) {
  let html = fs.readFileSync(file, "utf8");
  for (const asset of revisions) {
    const escaped = asset.source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reference = new RegExp(`((?:\\.\\./|/)?assets/${asset.directory}/)${escaped}(?:\\?v=\\d+)?`, "g");
    html = html.replace(reference, `$1${asset.filename}`);
  }
  fs.writeFileSync(file, html);
}

console.log(
  `Prepared ${entries.length} deployable entries in .pages-dist with ` +
  revisions.map((asset) => asset.filename).join(" and ") +
  "."
);
