// scripts/patch-latest-plans-render-canvas.js
//
// Körs lokalt från repo-roten:
//
//   node scripts/patch-latest-plans-render-canvas.js
//
// Syfte:
// Ersätter endast legacy renderCanvas()-blocket i app.js så att app.js inte
// längre läser latestPackingLayout/latestSawmillCutPlan direkt i renderingen.
//
// Scriptet är avsiktligt strikt: om exakt förväntat block inte hittas avbryts
// körningen utan att ändra filen.

const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "..", "app.js");
const source = fs.readFileSync(appPath, "utf8");

const before = `function renderCanvas(block, geom, v, sawList) {
  if (latestPackingLayout && latestPackingLayout.length) {
    renderPackingCanvas(block, geom, v, latestPackingLayout, latestSawmillCutPlan);
    return;
  }
  renderTimberCanvas(block, geom, v, sawList);
}`;

const after = `function renderCanvas(block, geom, v, sawList) {
  if (window.SawRenderCanvasLatestPlanAdapter && typeof window.SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans === "function") {
    window.SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans(block, geom, v, sawList);
    return;
  }

  renderTimberCanvas(block, geom, v, sawList);
}`;

if (!source.includes(before)) {
  console.error("Förväntat renderCanvas-block hittades inte. app.js ändrades inte.");
  process.exit(1);
}

const next = source.replace(before, after);
fs.writeFileSync(appPath, next, "utf8");
console.log("app.js uppdaterad: renderCanvas läser inte längre latest*-globals direkt.");
