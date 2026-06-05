// scripts/patch-remove-latest-plans-canvas-fallback.js
//
// Körs lokalt från repo-roten:
//
//   node scripts/patch-remove-latest-plans-canvas-fallback.js
//
// Syfte:
// Tar bort sista fallback-läsningen av latestPackingLayout i legacy canvas-koden.
// Efter detta ska packningslayout alltid hämtas via SawLatestPlans.
//
// Scriptet är strikt och kräver exakt det migrerade blocket.

const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "..", "app.js");
const source = fs.readFileSync(appPath, "utf8");

const before = `  const packingLayoutForCanvas = window.SawLatestPlans && typeof window.SawLatestPlans.getPackingLayout === "function"
    ? window.SawLatestPlans.getPackingLayout()
    : latestPackingLayout;`;

const after = `  const packingLayoutForCanvas = window.SawLatestPlans.getPackingLayout();`;

if (!source.includes(before)) {
  console.error("Förväntat canvas-fallbackblock hittades inte. app.js ändrades inte.");
  process.exit(1);
}

const next = source.replace(before, after);
fs.writeFileSync(appPath, next, "utf8");
console.log("app.js uppdaterad: canvas använder endast SawLatestPlans.");
