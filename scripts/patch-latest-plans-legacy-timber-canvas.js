// scripts/patch-latest-plans-legacy-timber-canvas.js
//
// Körs lokalt från repo-roten:
//
//   node scripts/patch-latest-plans-legacy-timber-canvas.js
//
// Syfte:
// Migrerar den kvarvarande latestPackingLayout-läsningen i legacy timber canvas-
// koden i app.js. Denna kod ligger inte i renderCanvas()-blocket utan inne i den
// äldre canvasritningen som fortfarande finns kvar i app.js.
//
// Scriptet är strikt: om exakt förväntat block inte hittas avbryts körningen utan
// att ändra filen.

const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "..", "app.js");
const source = fs.readFileSync(appPath, "utf8");

const before = `  // Sågverk / packning: rita hela packningslayouten i stället för bara centrumblocket.
  if (latestPackingLayout && latestPackingLayout.length) {
    latestPackingLayout.forEach((r, idx) => {`;

const after = `  // Sågverk / packning: rita hela packningslayouten i stället för bara centrumblocket.
  const packingLayoutForCanvas = window.SawLatestPlans && typeof window.SawLatestPlans.getPackingLayout === "function"
    ? window.SawLatestPlans.getPackingLayout()
    : latestPackingLayout;

  if (packingLayoutForCanvas && packingLayoutForCanvas.length) {
    packingLayoutForCanvas.forEach((r, idx) => {`;

if (!source.includes(before)) {
  console.error("Förväntat legacy timber canvas-block hittades inte. app.js ändrades inte.");
  process.exit(1);
}

const next = source.replace(before, after);
fs.writeFileSync(appPath, next, "utf8");
console.log("app.js uppdaterad: legacy timber canvas läser packningslayout via SawLatestPlans när möjligt.");
