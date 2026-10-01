const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const imageDir = path.resolve(__dirname, "../assets/img");

const photos = {
  "sky.jpg": [640, 960, 1600],
  "contact-sky.jpg": [640, 960, 1600, 1920],
  "board.jpg": [480, 800, 960, 975],
  "event.jpg": [480, 800, 960, 1500],
  "founder-1.jpg": [320, 600],
  "founder-2.jpg": [320, 600],
  "team-beatrice.jpg": [320, 600],
  "team-stefano.jpg": [320, 600],
  "team-nils.jpg": [320, 600, 935],
  "team-moritz.jpg": [320, 600, 935],
  "insight-cover.jpg": [640, 960, 1300],
  "insight-staerken.jpg": [480, 800, 960, 1300],
  "insight-cake.jpg": [480, 800, 960, 1300],
  "insight-govtech.jpg": [480, 800, 960, 1300],
  "insight-balloon.jpg": [480, 800, 960, 1300],
  "insight-kita.jpg": [480, 800, 960, 1300],
  "insight-empowered.jpg": [480, 800, 960, 1300],
  "insight-vision-dome.jpg": [480, 800, 960, 1300],
  "insight-vision-eagle.jpg": [480, 800, 960, 1300],
  "insight-birthday-team.jpg": [480, 800, 960, 1200],
  "insight-birthday-cocktail.jpg": [480, 800, 960, 1300],
  "insight-fly.jpg": [480, 800, 960, 1300],
  "insight-hochschule-workshop.jpg": [480, 800, 889],
  "insight-hochschule-laptop.jpg": [480, 760, 768],
  "case-kita-workshop.jpg": [480, 800, 960, 1300],
  "case-kita-presentation.jpg": [480, 800, 960, 1300],
  "case-kita-objects.jpg": [480, 800, 960, 1300],
  "case-ki-magic.jpg": [480, 800, 960, 1300],
  "case-ki-neon.jpg": [480, 800, 960, 1300],
  "case-ki-umbrella.jpg": [480, 800, 960, 1300],
  "case-wissen-collaborate.jpg": [480, 800, 960, 1300],
  "case-wissen-laptop.jpg": [480, 800, 960, 1300],
  "case-wissen-cafe.jpg": [480, 800, 960, 1300],
  "case-personal-presentation.jpg": [480, 800, 960, 1300],
  "case-personal-notes.jpg": [480, 800, 960, 1300],
  "case-personal-vibes.jpg": [480, 800, 960, 1300],
  "case-pm-training.jpg": [480, 800, 960, 1300],
  "case-pm-lounge.jpg": [480, 800, 960, 1300],
  "case-pm-workspace.jpg": [480, 800, 960, 1300],
  "case-strategic-calm.jpg": [480, 800],
  "case-strategic-skyline.jpg": [480, 800, 960, 1300],
  "case-strategic-hands.jpg": [480, 800, 960, 1300]
};
// Hinweis: Die insight-vision-*/insight-birthday-*/insight-fly/insight-hochschule-*/case-*
// Quellbilder wurden ohne Node (kein sharp verfuegbar) direkt als JPEG-Varianten per
// sips erzeugt, da diese Umgebung kein Node/npm bereitstellte. Die HTML-Seiten binden
// sie daher aktuell als reines <img srcset="...jpg"> ohne <picture><source webp> ein.
// Wer Node zur Verfuegung hat, kann `node scripts/generate-responsive-images.cjs`
// erneut laufen lassen (erzeugt zusaetzlich die WebP-Varianten) und die betroffenen
// <figure>-Blöcke in den Insight-Seiten auf das übliche <picture><source webp>-Muster
// umstellen.

const transparentResponsive = {
  "vision-billboard.png": [300, 600, 818],
  "signal-warm.png": [450, 600, 900, 1200, 1800]
};

const transparentSingle = [
  "about-champagne.png",
  "about-portrait.png",
  "about-facade.png",
  "about-espresso.png"
];

function targetName(file, width, extension) {
  return `${path.parse(file).name}-${width}.${extension}`;
}

async function createPhotoVariants(file, widths) {
  const source = path.join(imageDir, file);
  for (const width of widths) {
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 88, effort: 6, smartSubsample: true })
      .toFile(path.join(imageDir, targetName(file, width, "webp")));
  }
}

async function createTransparentVariants(file, widths) {
  const source = path.join(imageDir, file);
  for (const width of widths) {
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ lossless: true, effort: 6 })
      .toFile(path.join(imageDir, targetName(file, width, "webp")));
    if (file === "vision-billboard.png") {
      await sharp(source)
        .resize({ width, withoutEnlargement: true })
        .avif({ quality: 90, effort: 6, chromaSubsampling: "4:4:4" })
        .toFile(path.join(imageDir, targetName(file, width, "avif")));
    }
  }
}

async function createTransparentSingle(file) {
  const source = path.join(imageDir, file);
  const metadata = await sharp(source).metadata();
  await sharp(source)
    .webp({ lossless: true, effort: 6 })
    .toFile(path.join(imageDir, targetName(file, metadata.width, "webp")));
}

(async () => {
  for (const [file, widths] of Object.entries(photos)) await createPhotoVariants(file, widths);
  for (const [file, widths] of Object.entries(transparentResponsive)) await createTransparentVariants(file, widths);
  for (const file of transparentSingle) await createTransparentSingle(file);

  const generated = fs.readdirSync(imageDir).filter((file) => /-(?:279|300|320|331|334|380|450|480|599|600|640|800|818|900|960|975|1200|1300|1500|1600|1800|1920)\.(?:webp|avif)$/.test(file));
  const bytes = generated.reduce((sum, file) => sum + fs.statSync(path.join(imageDir, file)).size, 0);
  console.log(`Generated ${generated.length} responsive image files (${(bytes / 1024 / 1024).toFixed(2)} MiB).`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
