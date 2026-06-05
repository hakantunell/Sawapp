// scripts/patch-current-step-to-sawstate.js
//
// Körs lokalt från repo-roten:
//
//   node scripts/patch-current-step-to-sawstate.js
//
// Syfte:
// Migrerar app.js bort från legacy-variabeln currentStepIndex och använder
// SawState.getCurrentStepIndex()/setCurrentStepIndex()/moveCurrentStep().
//
// Scriptet gör en större men fortfarande deterministisk migration. Om något
// förväntat block saknas avbryts körningen utan att skriva app.js.

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
  "currentStepIndex declaration",
  `let currentStepIndex = 0;\n\n\n`,
  ``
);

replaceStrict(
  "renderSawList selected step read",
  `    tr.className = (s.step - 1) === currentStepIndex ? "selected-step" : "";`,
  `    tr.className = (s.step - 1) === window.SawState.getCurrentStepIndex() ? "selected-step" : "";`
);

replaceStrict(
  "renderSawList row click write",
  `    tr.onclick = () => { currentStepIndex = s.step - 1; update(); };`,
  `    tr.onclick = () => { window.SawState.setCurrentStepIndex(s.step - 1); update(); };`
);

replaceStrict(
  "renderSawmillCutPlan selected step read",
  `    tr.className = (s.step - 1) === currentStepIndex ? "selected-step" : "";`,
  `    tr.className = (s.step - 1) === window.SawState.getCurrentStepIndex() ? "selected-step" : "";`
);

replaceStrict(
  "renderSawmillCutPlan row click write",
  `    tr.onclick = () => { currentStepIndex = s.step - 1; update(); };`,
  `    tr.onclick = () => { window.SawState.setCurrentStepIndex(s.step - 1); update(); };`
);

replaceStrict(
  "renderTimberCanvas step read",
  `  const step = sawList[currentStepIndex] || sawList[0];`,
  `  const stepIndex = window.SawState.getCurrentStepIndex();\n  const step = sawList[stepIndex] || sawList[0];`
);

replaceStrict(
  "renderTimberCanvas planes read",
  `  const planes = completedCutPlanes(block, sawList, currentStepIndex);`,
  `  const planes = completedCutPlanes(block, sawList, stepIndex);`
);

replaceStrict(
  "renderTimberCanvas support check read",
  `  if (shouldSupportOnBlockFace(block, sawList, currentStepIndex, step ? step.rotationValue : 0)) {`,
  `  if (shouldSupportOnBlockFace(block, sawList, stepIndex, step ? step.rotationValue : 0)) {`
);

replaceStrict(
  "renderPackingCanvas planStep read",
  `  const planStep = sawmillCutPlan && sawmillCutPlan[currentStepIndex] ? sawmillCutPlan[currentStepIndex] : sawmillCutPlan?.[0];`,
  `  const stepIndex = window.SawState.getCurrentStepIndex();\n  const planStep = sawmillCutPlan && sawmillCutPlan[stepIndex] ? sawmillCutPlan[stepIndex] : sawmillCutPlan?.[0];`
);

replaceStrict(
  "renderPackingCanvas slabCuts read",
  `  const slabCuts = completedSlabCuts(sawmillCutPlan, currentStepIndex);`,
  `  const slabCuts = completedSlabCuts(sawmillCutPlan, stepIndex);`
);

replaceStrict(
  "renderPackingCanvas support bottom read",
  `  const supportBottom = remainingPackingBoundsWithSlabCuts(packingLayout, sawmillCutPlan, currentStepIndex, planStep ? planStep.rotationValue : 0);`,
  `  const supportBottom = remainingPackingBoundsWithSlabCuts(packingLayout, sawmillCutPlan, stepIndex, planStep ? planStep.rotationValue : 0);`
);

replaceStrict(
  "renderPackingCanvas done read",
  `  const done = completedPackingSources(sawmillCutPlan, currentStepIndex);`,
  `  const done = completedPackingSources(sawmillCutPlan, stepIndex);`
);

replaceStrict(
  "input reset handlers",
  `  $(id).addEventListener("input", () => { currentStepIndex = 0; update(); });\n  $(id).addEventListener("change", () => { currentStepIndex = 0; update(); });`,
  `  $(id).addEventListener("input", () => { window.SawState.resetCurrentStepIndex(); update(); });\n  $(id).addEventListener("change", () => { window.SawState.resetCurrentStepIndex(); update(); });`
);

replaceStrict(
  "renderDimensions move up",
  `    up.onclick = () => { [dimensions[i-1], dimensions[i]] = [dimensions[i], dimensions[i-1]]; currentStepIndex = 0; update(); };`,
  `    up.onclick = () => { [dimensions[i-1], dimensions[i]] = [dimensions[i], dimensions[i-1]]; window.SawState.resetCurrentStepIndex(); update(); };`
);

replaceStrict(
  "renderDimensions move down",
  `    down.onclick = () => { [dimensions[i+1], dimensions[i]] = [dimensions[i], dimensions[i+1]]; currentStepIndex = 0; update(); };`,
  `    down.onclick = () => { [dimensions[i+1], dimensions[i]] = [dimensions[i], dimensions[i+1]]; window.SawState.resetCurrentStepIndex(); update(); };`
);

replaceStrict(
  "renderDimensions active change",
  `    activeBox.onchange = () => { d.active = activeBox.checked; currentStepIndex = 0; update(); };`,
  `    activeBox.onchange = () => { d.active = activeBox.checked; window.SawState.resetCurrentStepIndex(); update(); };`
);

replaceStrict(
  "renderDimensions type change reset",
  `      currentStepIndex = 0;\n      update();`,
  `      window.SawState.resetCurrentStepIndex();\n      update();`
);

replaceStrict(
  "renderDimensions height change",
  `    heightInput.onchange = () => { d.height = +heightInput.value || 0; currentStepIndex = 0; update(); };`,
  `    heightInput.onchange = () => { d.height = +heightInput.value || 0; window.SawState.resetCurrentStepIndex(); update(); };`
);

replaceStrict(
  "renderDimensions width change reset",
  `      currentStepIndex = 0;\n      update();`,
  `      window.SawState.resetCurrentStepIndex();\n      update();`
);

replaceStrict(
  "renderDimensions wane change",
  `    waneInput.onchange = () => { d.waneMm = +waneInput.value || 0; currentStepIndex = 0; update(); };`,
  `    waneInput.onchange = () => { d.waneMm = +waneInput.value || 0; window.SawState.resetCurrentStepIndex(); update(); };`
);

replaceStrict(
  "renderDimensions wild change reset",
  `      currentStepIndex = 0;\n      update();`,
  `      window.SawState.resetCurrentStepIndex();\n      update();`
);

replaceStrict(
  "update active plan bounds",
  `  if (currentStepIndex >= activePlanLength) currentStepIndex = 0;`,
  `  if (window.SawState.getCurrentStepIndex() >= activePlanLength) window.SawState.resetCurrentStepIndex();\n  const currentStepIndex = window.SawState.getCurrentStepIndex();`
);

replaceStrict(
  "prev step onclick",
  `    $("prevStep").onclick = () => { currentStepIndex = (currentStepIndex - 1 + activePlanLength) % activePlanLength; update(); };`,
  `    $("prevStep").onclick = () => { window.SawState.moveCurrentStep(-1, activePlanLength); update(); };`
);

replaceStrict(
  "next step onclick",
  `    $("nextStep").onclick = () => { currentStepIndex = (currentStepIndex + 1) % activePlanLength; update(); };`,
  `    $("nextStep").onclick = () => { window.SawState.moveCurrentStep(1, activePlanLength); update(); };`
);

replaceStrict(
  "presetTimber reset",
  `  currentStepIndex = 0;\n  update();`,
  `  window.SawState.resetCurrentStepIndex();\n  update();`
);

replaceStrict(
  "bigPrev handler",
  `  if (sawList.length) { currentStepIndex = (currentStepIndex - 1 + activePlanLength) % activePlanLength; update(); }`,
  `  if (sawList.length) { window.SawState.moveCurrentStep(-1, sawList.length); update(); }`
);

replaceStrict(
  "bigNext handler",
  `  if (sawList.length) { currentStepIndex = (currentStepIndex + 1) % activePlanLength; update(); }`,
  `  if (sawList.length) { window.SawState.moveCurrentStep(1, sawList.length); update(); }`
);

const forbiddenPatterns = [
  /let\s+currentStepIndex\s*=/,
  /currentStepIndex\s*=/,
  /currentStepIndex\+\+/,
  /currentStepIndex--/,
];

for (const pattern of forbiddenPatterns) {
  if (pattern.test(next)) {
    console.error(`Legacy currentStepIndex-skrivning/deklaration finns kvar: ${pattern}. app.js ändrades inte.`);
    process.exit(1);
  }
}

if (next === original) {
  console.error("Ingen ändring gjordes. app.js ändrades inte.");
  process.exit(1);
}

fs.writeFileSync(appPath, next, "utf8");
console.log("app.js uppdaterad: currentStepIndex-skrivningar migrerade till SawState.");
