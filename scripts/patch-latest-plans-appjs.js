// scripts/patch-latest-plans-appjs.js
//
// Körs lokalt från repo-roten:
//
//   node scripts/patch-latest-plans-appjs.js
//
// Syfte:
// Kör båda små app.js-migreringarna i rätt ordning:
//
// 1. renderCanvas() slutar läsa latestPackingLayout/latestSawmillCutPlan direkt.
// 2. update() skriver via SawLatestPlans.setLatestPlans(...) när accessorn finns.
//
// Scriptet är idempotent på så sätt att det avbryter utan filändring om något av
// de exakta förväntade legacy-blocken saknas. Kör därför detta på en ren working
// tree och committa resultatet separat.

const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "..", "app.js");
const original = fs.readFileSync(appPath, "utf8");
let next = original;

function replaceStrict(label, before, after) {
  if (!next.includes(before)) {
    console.error(`Förväntat block hittades inte för: ${label}. app.js ändrades inte.`);
    process.exit(1);
  }

  next = next.replace(before, after);
}

replaceStrict(
  "renderCanvas latest plans read",
  `function renderCanvas(block, geom, v, sawList) {
  if (latestPackingLayout && latestPackingLayout.length) {
    renderPackingCanvas(block, geom, v, latestPackingLayout, latestSawmillCutPlan);
    return;
  }
  renderTimberCanvas(block, geom, v, sawList);
}`,
  `function renderCanvas(block, geom, v, sawList) {
  if (window.SawRenderCanvasLatestPlanAdapter && typeof window.SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans === "function") {
    window.SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans(block, geom, v, sawList);
    return;
  }

  renderTimberCanvas(block, geom, v, sawList);
}`
);

replaceStrict(
  "update latest plans write",
  `  latestPackingLayout = packingLayout;
  latestSawmillCutPlan = sawmillCutPlan;`,
  `  if (window.SawLatestPlans && typeof window.SawLatestPlans.setLatestPlans === "function") {
    window.SawLatestPlans.setLatestPlans(packingLayout, sawmillCutPlan);
  } else {
    latestPackingLayout = packingLayout;
    latestSawmillCutPlan = sawmillCutPlan;
  }`
);

if (next === original) {
  console.error("Ingen ändring gjordes. app.js ändrades inte.");
  process.exit(1);
}

fs.writeFileSync(appPath, next, "utf8");
console.log("app.js uppdaterad: latest plan-läsning och -skrivning migrerad via SawLatestPlans.");
