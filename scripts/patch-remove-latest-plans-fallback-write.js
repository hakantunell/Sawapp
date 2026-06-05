// scripts/patch-remove-latest-plans-fallback-write.js
//
// Körs lokalt från repo-roten efter att första app.js-migreringen är testad:
//
//   node scripts/patch-remove-latest-plans-fallback-write.js
//
// Syfte:
// Tar bort fallback-skrivningen till latestPackingLayout/latestSawmillCutPlan i
// update(), så SawLatestPlans blir enda skrivvägen för senaste planer.
//
// Scriptet är strikt: om exakt förväntat migrerat fallback-block inte hittas
// avbryts körningen utan att ändra filen.

const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "..", "app.js");
const source = fs.readFileSync(appPath, "utf8");

const before = `  if (window.SawLatestPlans && typeof window.SawLatestPlans.setLatestPlans === "function") {
    window.SawLatestPlans.setLatestPlans(packingLayout, sawmillCutPlan);
  } else {
    latestPackingLayout = packingLayout;
    latestSawmillCutPlan = sawmillCutPlan;
  }`;

const after = `  window.SawLatestPlans.setLatestPlans(packingLayout, sawmillCutPlan);`;

if (!source.includes(before)) {
  console.error("Förväntat fallback-skrivblock hittades inte. app.js ändrades inte.");
  process.exit(1);
}

const next = source.replace(before, after);
fs.writeFileSync(appPath, next, "utf8");
console.log("app.js uppdaterad: fallback-skrivning till latest*-globals borttagen.");
