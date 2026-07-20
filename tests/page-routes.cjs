const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const excludedDirectories = new Set([".pages-dist", ".wrangler", "functions", "node_modules", "tests"]);

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

function publicPath(file) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return "/" + relative.slice(0, -"index.html".length);
  return "/" + relative;
}

module.exports = htmlFiles(root).map(publicPath).sort();
