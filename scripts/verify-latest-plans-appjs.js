// scripts/verify-latest-plans-appjs.js
//
// Körs lokalt från repo-roten:
//
//   node scripts/verify-latest-plans-appjs.js
//
// Syfte:
// Verifierar att de två första app.js-migreringarna är gjorda:
//
// 1. renderCanvas() läser inte längre latestPackingLayout/latestSawmillCutPlan direkt.
// 2. update() skriver via SawLatestPlans.setLatestPlans(...) när accessorn finns.
//
// OBS: Det kan fortfarande finnas andra direkta latest*-användningar i app.js.
// De ska hanteras i separata små steg efter att de första två migrationerna är
// verifierade och browsertestade.

const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "..", "app.js");
const source = fs.readFileSync(appPath, "utf8");

const forbiddenBlocks = [
  {
    name: "legacy renderCanvas block",
    pattern: `function renderCanvas(block, geom, v, sawList) {
  if (latestPackingLayout && latestPackingLayout.length) {
    renderPackingCanvas(block, geom, v, latestPackingLayout, latestSawmillCutPlan);
    return;
  }
  renderTimberCanvas(block, geom, v, sawList);
}`,
  },
  {
    name: "direct latest plan write block",
    pattern: `  latestPackingLayout = packingLayout;
  latestSawmillCutPlan = sawmillCutPlan;`,
  },
];

const requiredBlocks = [
  {
    name: "renderCanvas delegates to SawRenderCanvasLatestPlanAdapter",
    pattern: `window.SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans(block, geom, v, sawList);`,
  },
  {
    name: "update writes through SawLatestPlans.setLatestPlans",
    pattern: `window.SawLatestPlans.setLatestPlans(packingLayout, sawmillCutPlan);`,
  },
];

const failures = [];

for (const block of forbiddenBlocks) {
  if (source.includes(block.pattern)) {
    failures.push(`Kvarvarande förbjudet block: ${block.name}`);
  }
}

for (const block of requiredBlocks) {
  if (!source.includes(block.pattern)) {
    failures.push(`Saknar förväntat migrerat block: ${block.name}`);
  }
}

if (failures.length) {
  console.error("Verifieringen misslyckades.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const remainingLatestLines = source
  .split(/\r?\n/)
  .map((line, index) => ({ line, number: index + 1 }))
  .filter(({ line }) => line.includes("latestPackingLayout") || line.includes("latestSawmillCutPlan"));

console.log("OK: de två första app.js-migreringarna är gjorda.");
if (remainingLatestLines.length) {
  console.log("Kvarvarande latest*-referenser att hantera i senare steg:");
  for (const occurrence of remainingLatestLines) {
    console.log(`- Rad ${occurrence.number}: ${occurrence.line}`);
  }
}
