// fix-v39.js
// Korrigerar kärnblockningssteg i Sågverk / packning.
// Ett center-/kärnblockningssteg ska använda färdig blockdimension som svärdhöjd,
// inte rundstockens ytterradie som stödreferens.

(function installPackingCenterBlockHeightFix(global) {
  const previousRoundContactForStep = typeof global.v36RoundContactForStep === "function"
    ? global.v36RoundContactForStep
    : null;

  global.v36RoundContactForStep = function v39RoundContactForStep(step) {
    if (step && step.kind === "center") return false;
    return previousRoundContactForStep ? previousRoundContactForStep(step) : false;
  };

  if (typeof global.buildSawmillCutPlan !== "function") return;

  const previousBuildSawmillCutPlan = global.buildSawmillCutPlan;

  function centerBladeHeight(step) {
    if (!step) return 0;
    const height = Number(step.thickness);
    if (Number.isFinite(height) && height > 0) return height;

    const source = step.source;
    if (!source) return Number(step.bladeToBed) || 0;
    if (step.side === "top" || step.side === "bottom") return Number(source.h) || 0;
    if (step.side === "right" || step.side === "left") return Number(source.w) || 0;
    return Number(step.bladeToBed) || 0;
  }

  function applyCenterBlockHeights(plan, values) {
    if (!Array.isArray(plan)) return plan;
    const v = values || {};
    const taperDiff = ((Number(v.rootDiameter) || 0) - (Number(v.topDiameter) || 0)) / 2;

    plan.forEach((step, index) => {
      if (!step || step.kind !== "center") return;

      const h = centerBladeHeight(step);
      step.bladeToBed = h;
      step.supportHeightAverage = h;

      if (index === 0) {
        step.rootSupportHeight = h + taperDiff / 2;
        step.topSupportHeight = h - taperDiff / 2;
        step.supportHeightDiff = step.rootSupportHeight - step.topSupportHeight;
      } else {
        step.rootSupportHeight = h;
        step.topSupportHeight = h;
        step.supportHeightDiff = 0;
      }

      step.reference = step.reference || "Blockning av kärna";
      step.cut = step.cut || `Blocka ${step.label || "kärna"}`;
    });

    return plan;
  }

  global.buildSawmillCutPlan = function buildSawmillCutPlanWithCenterBlockHeights(packingLayout, block, geom, values) {
    const plan = previousBuildSawmillCutPlan(packingLayout, block, geom, values);
    return applyCenterBlockHeights(plan, values);
  };

  if (typeof global.update === "function") global.update();
})(window);
