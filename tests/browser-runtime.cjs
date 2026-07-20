const { chromium, firefox, webkit } = require("playwright");

const browsers = { chromium, firefox, webkit };

function selectedBrowser() {
  const name = process.env.BROWSER || "chromium";
  if (!browsers[name]) throw new Error(`Unsupported BROWSER=${name}; use chromium, firefox or webkit.`);
  return { name, type: browsers[name] };
}

async function launchBrowser() {
  const selected = selectedBrowser();
  const managed = process.env.PLAYWRIGHT_MANAGED_BROWSER === "1" || selected.name !== "chromium";
  if (managed) return selected.type.launch({ headless: true });
  try {
    return await selected.type.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
  } catch (error) {
    return selected.type.launch({ headless: true });
  }
}

module.exports = { launchBrowser, selectedBrowser };
