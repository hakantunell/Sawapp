// scripts/verify-latest-plans-appjs.js
//
// Körs lokalt från repo-roten:
//
//   node scripts/verify-latest-plans-appjs.js
//
// Syfte:
// Verifierar att app.js inte längre har direkta läsningar eller skrivningar av
// latestPackingLayout/latestSawmillCutPlan efter att patch-scriptet har körts.
//
// Deklarationerna tillåts fortfarande i detta steg eftersom de behövs som
// legacy-fallback tills nästa migreringssteg är testat.

const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "..", "app.js");
const source = fs.readFileSync(appPath, "utf8");

const allowed = new Set([
  "let latestPackingLayout = null;",
  "let latestSawmillCutPlan = null;",
  "latestPackingLayout = packingLayout;",
  "latestSawmillCutPlan = sawmillCutPlan;",
]);

const checks = [
  {
    name: "legacy renderCanvas condition",
    pattern: "if (latestPackingLayout && latestPackingLayout.length)",
  },
  {
    name: "legacy renderPackingCanvas arguments",
    pattern: "renderPackingCanvas(block, geom, v, latestPackingLayout, latestSawmillCutPlan)",
  },
  {
    name: "direct latestPackingLayout write without fallback block",
    pattern: "  latestPackingLayout = packingLayout;\n  latestSawmillCutPlan = sawmillCutPlan;",
  },
];

const failures = checks.filter((check) => source.includes(check.pattern));

const directOccurrences = source
  .split(/\r?\n/)
  .map((line, index) => ({ line, number: index + 1 }))
  .filter(({ line }) => line.includes("latestPackingLayout") || line.includes("latestSawmillCutPlan"))
  .filter(({ line }) => !allowed.has(line.trim()))
  .filter(({ line }) => !line.includes("SawLatestPlans"));

if (failures.length || directOccurrences.length) {
  console.error("Verifieringen misslyckades.");

  for (const failure of failures) {
    console.error(`- Hittade kvarvarande mönster: ${failure.name}`);
  }

  for (const occurrence of directOccurrences) {
    console.error(`- Rad ${occurrence.number}: ${occurrence.line}`);
  }

  process.exit(1);
}

console.log("OK: app.js har inga direkta latest*-läsningar/skrivningar utöver tillåten legacy-fallback.");
