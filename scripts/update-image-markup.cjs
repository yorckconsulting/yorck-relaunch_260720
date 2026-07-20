const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const images = {
  "work.jpg": { width: 1300, height: 975, widths: [480, 800, 960, 1300] },
  "lab.jpg": { width: 1300, height: 1133, widths: [480, 800, 960, 1300] },
  "board.jpg": { width: 975, height: 1300, widths: [480, 800, 960, 975] },
  "stage.jpg": { width: 1300, height: 1034, widths: [480, 800, 960, 1300] },
  "whiteboard.jpg": { width: 1200, height: 749, widths: [480, 800, 960, 1200] },
  "canvas.jpg": { width: 1200, height: 749, widths: [480, 800, 960, 1200] },
  "event.jpg": { width: 1500, height: 1193, widths: [480, 800, 960, 1500] },
  "workshop.jpg": { width: 1500, height: 1125, widths: [480, 800, 960, 1500] }
};

function webpSrcset(url, widths) {
  const parsed = path.posix.parse(url);
  return widths.map((width) => `${parsed.dir}/${parsed.name}-${width}.webp ${width}w`).join(", ");
}

function responsivePicture(url, alt, context) {
  const filename = path.posix.basename(url);
  const image = images[filename];
  if (!image) throw new Error(`Missing image metadata for ${url}`);
  const loading = context === "hero" ? "" : ' loading="lazy"';
  const priority = context === "hero" ? ' fetchpriority="high"' : "";
  const sizes = context === "tile" ? "(max-width: 720px) 82vw, 380px" : "100vw";
  return `<picture${context === "tile" ? ' class="tile__media"' : ""}><source type="image/webp" srcset="${webpSrcset(url, image.widths)}" sizes="${sizes}"><img src="${url}" alt="${alt}" width="${image.width}" height="${image.height}"${loading}${priority} decoding="async"></picture>`;
}

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

let changed = 0;
for (const file of htmlFiles(root)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  html = html.replace(/<div class="tile__media" style="background-image:url\(([^)]+\.jpg)\)"><\/div>/g, (_, url) => responsivePicture(url, "", "tile"));

  html = html.replace(/<div class="article-hero__bg" aria-hidden="true"><img src="([^"]+\.jpg)" alt="" fetchpriority="high"><\/div>/g, (_, url) =>
    `<div class="article-hero__bg" aria-hidden="true">${responsivePicture(url, "", "hero")}</div>`
  );

  html = html.replace(/<div class="article-figure__frame"><img src="([^"]+\.jpg)" alt="([^"]*)" loading="lazy"><\/div>/g, (_, url, alt) =>
    `<div class="article-figure__frame">${responsivePicture(url, alt, "figure")}</div>`
  );

  for (const [filename, image] of Object.entries(images)) {
    const name = path.posix.parse(filename).name;
    const current = new RegExp(`((?:\.\./)?assets/img/${name})-480\\.webp 480w, \\1-800\\.webp 800w, (?:\\1-960\\.webp 960w, )?\\1-(?:975|1200|1300|1500)\\.webp (?:975|1200|1300|1500)w`, "g");
    html = html.replace(current, (_, prefix) => image.widths.map((width) => `${prefix}-${width}.webp ${width}w`).join(", "));
  }
  html = html.replace(/(<div class="article-figure__frame"><picture><source[^>]+) sizes="100vw"/g, '$1 sizes="(max-width: 960px) calc(100vw - 40px), 920px"');

  if (html !== before) {
    fs.writeFileSync(file, html);
    changed++;
  }
}

console.log(`Updated responsive image markup in ${changed} HTML files.`);
