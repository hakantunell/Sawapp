// fix-v40.js
// Gör stödhöjderna i Sågverk / packning konsekventa med själva ritningen.
// Tidigare kunde planens höjd beräknas från packningsrektanglarna medan ritningen
// lade kvarvarande rundkropp mot bädden. Då hamnade svärdslinjen fel relativt
// sidobitarna.

(function installRenderConsistentPackingHeights(global) {
  if (typeof global.buildSawmillCutPlan !== "function") return;

  const previousBuildSawmillCutPlan = global.buildSawmillCutPlan;

  function rotationValue(step) {
    return step ? (Number(step.rotationValue) || 0) : 0;
  }

  function bladeYForStep(step) {
    if (!step) return 0;
    if (typeof global.packingBladeYForStep === "function") {
      const y = global.packingBladeYForStep(step);
      if (Number.isFinite(y)) return y;
    }
    const source = step.source;
    if (!source) return 0;
    if (step.side === "bottom") return source.y + source.h;
    return source.y || 0;
  }

  function supportBottomForPlanStep(packingLayout, plan, index, geom, step) {
    const rot = rotationValue(step);
    const packingBottom = typeof global.remainingPackingBoundsWithSlabCuts === "function"
      ? global.remainingPackingBoundsWithSlabCuts(packingLayout, plan, index, rot)
      : 0;

    const cuts = typeof global.completedSlabCuts === "function"
      ? global.completedSlabCuts(plan, index)
      : [];

    const bodyBottom = geom && typeof global.v36RemainingBodyBottomWithCuts === "function"
      ? global.v36RemainingBodyBottomWithCuts(geom.designDiameter / 2, cuts, rot)
      : packingBottom;

    const roundContact = typeof global.v36RoundContactForStep === "function"
      ? global.v36RoundContactForStep(step)
      : false;

    return roundContact ? bodyBottom : packingBottom;
  }

  function applySupportHeights(plan, packingLayout, geom, values) {
    if (!Array.isArray(plan)) return plan;
    const v = values || {};
    const taperDiff = ((Number(v.rootDiameter) || 0) - (Number(v.topDiameter) || 0)) / 2;

    plan.forEach((step, index) => {
      if (!step) return;

      const supportBottom = supportBottomForPlanStep(packingLayout, plan, index, geom, step);
      const bladeY = bladeYForStep(step);
      const h = Math.max(0, supportBottom - bladeY);
      const roundContact = typeof global.v36RoundContactForStep === "function"
        ? global.v36RoundContactForStep(step)
        : false;
      const taperApplies = roundContact || (step.kind === "center" && index === 0);

      step.bladeToBed = h;
      step.supportHeightAverage = h;

      if (taperApplies) {
        step.rootSupportHeight = h + taperDiff / 2;
        step.topSupportHeight = h - taperDiff / 2;
        step.supportHeightDiff = step.rootSupportHeight - step.topSupportHeight;
      } else {
        step.rootSupportHeight = h;
        step.topSupportHeight = h;
        step.supportHeightDiff = 0;
      }
    });

    return plan;
  }

  global.buildSawmillCutPlan = function buildSawmillCutPlanWithRenderConsistentHeights(packingLayout, block, geom, values) {
    const plan = previousBuildSawmillCutPlan(packingLayout, block, geom, values);
    return applySupportHeights(plan, packingLayout, geom, values);
  };

  if (typeof global.update === "function") global.update();
})(window);
