// v37.1: korrigerar sidobits-snitt.
// Mål:
// - slab/ytterdel: såglinjen ska ligga ovanför plankan
// - side/frigör planka: såglinjen ska ligga direkt under samma planka
// Ladda efter app.js och fix-v36.js.

function v37ThicknessFromStep(step) {
  if (!step) return 0;
  if (Number.isFinite(step.thickness) && step.thickness > 0) return step.thickness;
  const m = String(step.label || "").match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return 0;
  return Math.min(Number(m[1]), Number(m[2])) || 0;
}

function v37Kerf() {
  try {
    const v = typeof values === "function" ? values() : {};
    return Number(v.kerf || 0);
  } catch (_) {
    return 0;
  }
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
    const kerfAllowance = v37Kerf() / 2;

    for (let i = 0; i < plan.length; i++) {
      const slab = plan[i];
      const side = plan[i + 1];
      if (!slab || !side) continue;
      if (slab.kind !== "slab" || side.kind !== "side") continue;
      if (slab.side !== side.side || slab.rotationValue !== side.rotationValue) continue;

      const t = v37ThicknessFromStep(side) || v37ThicknessFromStep(slab);
      if (!t) continue;

      const slabRootBase = Number.isFinite(slab.rootSupportHeight) ? slab.rootSupportHeight : (slab.bladeToBed || 0);
      const slabTopBase = Number.isFinite(slab.topSupportHeight) ? slab.topSupportHeight : (slab.bladeToBed || 0);

      // v36 ligger i praktiken vid plankans inner-/referenssnitt.
      // Flytta ytterdelssnittet upp med plankans tjocklek + halv kerf så att det hamnar ovanför plankan.
      const outerRoot = slabRootBase + t + kerfAllowance;
      const outerTop = slabTopBase + t + kerfAllowance;
      v37SetHeights(slab, outerRoot, outerTop);
      slab.__v37OuterSlabAdjusted = true;
      slab.note = (slab.note || "") + " • Yttersnitt ovanför planka";

      // Frigöringssnittet ska ligga direkt under samma planka, inte nere vid blockets kant.
      // Det blir en planktjocklek under yttersnittet, med kerfkompensationen neutraliserad.
      v37SetHeights(side, outerRoot - t - kerfAllowance, outerTop - t - kerfAllowance);
      side.__v37InnerSideAdjusted = true;
      side.note = (side.note || "") + " • Frigöringssnitt direkt under planka";
    }

    return plan;
  };
}

if (typeof update === "function") update();
