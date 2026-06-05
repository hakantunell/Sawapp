// scripts/patch-latest-plans-update-write.js
//
// Körs lokalt från repo-roten:
//
//   node scripts/patch-latest-plans-update-write.js
//
// Syfte:
// Ersätter endast skrivningen till legacy latest*-globals i app.js med ett
// anrop till SawLatestPlans.setLatestPlans(...).
//
// Scriptet är avsiktligt strikt: om exakt förväntat block inte hittas avbryts
// körningen utan att ändra filen.

const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "..", "app.js");
const source = fs.readFileSync(appPath, "utf8");

const before = `  latestPackingLayout = packingLayout;
  latestSawmillCutPlan = sawmillCutPlan;`;

const after = `  if (window.SawLatestPlans && typeof window.SawLatestPlans.setLatestPlans === "function") {
    window.SawLatestPlans.setLatestPlans(packingLayout, sawmillCutPlan);
  } else {
    latestPackingLayout = packingLayout;
    latestSawmillCutPlan = sawmillCutPlan;
  }`;

if (!source.includes(before)) {
  console.error("Förväntad latest*-skrivning hittades inte. app.js ändrades inte.");
  process.exit(1);
}

const next = source.replace(before, after);
fs.writeFileSync(appPath, next, "utf8");
console.log("app.js uppdaterad: update() skriver via SawLatestPlans när accessorn finns.");
