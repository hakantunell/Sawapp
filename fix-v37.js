// v37.4: generell kerf-regel för alla sidobits-/planksnitt.
//
// Viktig princip:
// Du mäter såginställningen från underkant svärd/kedja ned till stödet.
// Därför måste avståndet mellan två snitt som skapar en planka vara:
//
//   färdig planktjocklek + sågspår/kerf
//
// Exempel:
//   20 mm planka + 6 mm sågspår = 26 mm skillnad mellan inställningarna.
//
// Denna fix gör INGA specialregler för specifika steg eller rotationer.
// Den går igenom sågplanen och hittar varje par:
//   1) slab / ta bort ytterdel
//   2) side / frigör planka
// och sätter höjderna så att yttersnitt och frigöringssnitt alltid skiljer
// exakt planktjocklek + kerf.
//
// Ladda efter app.js och fix-v36.js.

function v37ThicknessFromStep(step) {
  if (!step) return 0;
  if (Number.isFinite(step.thickness) && step.thickness > 0) return step.thickness;
  const m = String(step.label || "").match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return 0;
  return Math.min(Number(m[1]), Number(m[2])) || 0;
}

function v37Kerf() {
  const direct = document.getElementById("kerf");
  if (direct) {
    const k = Number(direct.value);
    if (Number.isFinite(k)) return k;
  }
  try {
    const v = typeof values === "function" ? values() : {};
    return Number(v.kerf || 0);
  } catch (_) {
    return 0;
  }
}

function v37StepRootHeight(step) {
  if (Number.isFinite(step?.rootSupportHeight)) return step.rootSupportHeight;
  if (Number.isFinite(step?.bladeToBed)) return step.bladeToBed;
  return 0;
}

function v37StepTopHeight(step) {
  if (Number.isFinite(step?.topSupportHeight)) return step.topSupportHeight;
  if (Number.isFinite(step?.bladeToBed)) return step.bladeToBed;
  return 0;
}

function v37SetHeights(step, root, top) {
  step.rootSupportHeight = root;
  step.topSupportHeight = top;
  step.bladeToBed = (root + top) / 2;
  step.supportHeightAverage = step.bladeToBed;
  step.supportHeightDiff = root - top;
}

if (typeof buildSawmillCutPlan === "function" && !window.__v37SideCutHeightInstalled) {
  window.__v37SideCutHeightInstalled = true;
  const previousBuildSawmillCutPlan = buildSawmillCutPlan;

  buildSawmillCutPlan = function(...args) {
    const plan = previousBuildSawmillCutPlan.apply(this, args) || [];
    const kerf = v37Kerf();

    for (let i = 0; i < plan.length - 1; i++) {
      const outerStep = plan[i];
      const innerStep = plan[i + 1];

      // Generisk regel: ett planksnitt består av ytterdelssnitt följt av frigöringssnitt.
      if (!outerStep || !innerStep) continue;
      if (outerStep.kind !== "slab" || innerStep.kind !== "side") continue;
      if (outerStep.side !== innerStep.side) continue;
      if (outerStep.rotationValue !== innerStep.rotationValue) continue;

      const thickness = v37ThicknessFromStep(innerStep) || v37ThicknessFromStep(outerStep);
      if (!thickness) continue;

      // Frigöringssnittet är snittet under plankan. Använd dess befintliga nivå som bas,
      // eftersom föregående planberäkningar redan har tagit hänsyn till stöd, rotation,
      // rund/plan anliggning och tidigare bortsågade bitar.
      const innerRoot = v37StepRootHeight(innerStep);
      const innerTop = v37StepTopHeight(innerStep);

      // Yttersnittet ska ligga planktjocklek + hela kerfen ovanför frigöringssnittet.
      const outerRoot = innerRoot + thickness + kerf;
      const outerTop = innerTop + thickness + kerf;

      v37SetHeights(outerStep, outerRoot, outerTop);
      v37SetHeights(innerStep, innerRoot, innerTop);

      outerStep.__v37GenericKerfAdjusted = true;
      innerStep.__v37GenericKerfAdjusted = true;
      outerStep.note = (outerStep.note || "") + ` • Yttersnitt = frigöringssnitt + ${thickness} mm + ${kerf} mm kerf`;
      innerStep.note = (innerStep.note || "") + " • Frigöringssnitt under planka";
    }

    return plan;
  };
}

if (typeof update === "function") update();
