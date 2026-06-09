// src/legacy-app/91-update-pipeline.js
// Beräkningspipeline för legacy update-flödet.

(function initSawUpdatePipeline(global) {
  function selectedOptimizationMode() {
    const el = global.$ ? global.$("optimizationMode") : null;
    return el ? el.value : "mixed";
  }

  function getCurrentStepIndex() {
    if (global.SawState && typeof global.SawState.getCurrentStepIndex === "function") {
      return global.SawState.getCurrentStepIndex();
    }
    return 0;
  }

  function setCurrentStepIndex(index) {
    if (global.SawState && typeof global.SawState.setCurrentStepIndex === "function") {
      global.SawState.setCurrentStepIndex(index);
    }
  }

  function resetCurrentStepIndex() {
    if (global.SawState && typeof global.SawState.resetCurrentStepIndex === "function") {
      global.SawState.resetCurrentStepIndex();
    }
  }

  function clampStepIndex(index, length) {
    const safeLength = Math.max(0, Number(length) || 0);
    if (safeLength <= 0) return 0;
    return Math.min(Math.max(Number(index) || 0, 0), safeLength - 1);
  }

  function calculateMetrics(block, geom, sideYield, packingLayout) {
    const sideArea = packingLayout
      ? packingLayout.reduce((sum, r) => sum + (r.w * r.h / 1e6), 0)
      : (sideYield ? sideYield.reduce((sum, s) => sum + (s.width * s.thickness / 1e6), 0) : 0);
    const sawnArea = block ? (block.width * block.height / 1e6 + sideArea) : 0;
    const logArea = geom ? Math.PI * Math.pow(geom.designDiameter / 2, 2) / 1e6 : 0;
    const yieldPct = block && logArea ? (sawnArea / logArea) * 100 : 0;

    return { sideArea, sawnArea, logArea, yieldPct };
  }

  function buildPlanContext() {
    const v = global.values();
    const geom = global.computeGeometry(v);
    const block = global.findBestCenterBlock(geom, v);
    const sawList = global.buildSawList(block, geom, v);
    const sideYield = global.computeSideYield(block, geom, v);
    const packingLayout = selectedOptimizationMode() === "sawmill"
      ? global.computeSawmillPacking(geom, v)
      : null;
    const sawmillCutPlan = packingLayout
      ? global.buildSawmillCutPlan(packingLayout, block, geom, v)
      : null;
    const activePlan = sawmillCutPlan || sawList;
    const activePlanLength = Array.isArray(activePlan) ? activePlan.length : 0;
    const stepIndex = clampStepIndex(getCurrentStepIndex(), activePlanLength);

    if (stepIndex !== getCurrentStepIndex()) {
      setCurrentStepIndex(stepIndex);
    }

    return {
      v,
      geom,
      block,
      sawList,
      sideYield,
      packingLayout,
      sawmillCutPlan,
      activePlan,
      activePlanLength,
      stepIndex,
      step: activePlanLength ? activePlan[stepIndex] : null,
      metrics: calculateMetrics(block, geom, sideYield, packingLayout),
    };
  }

  function moveCurrentStep(delta, context) {
    const length = context && context.activePlanLength ? context.activePlanLength : 0;
    if (!length) return;

    if (global.SawState && typeof global.SawState.moveCurrentStep === "function") {
      global.SawState.moveCurrentStep(delta, length);
    }
  }

  global.SawUpdatePipeline = {
    buildPlanContext,
    moveCurrentStep,
    resetCurrentStepIndex,
  };

  global.buildPlanContext = buildPlanContext;
})(window);
