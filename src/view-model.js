// src/view-model.js
// Central beräkning av vy-modell för Sawapp.
//
// Passiv modul: ersätter inte legacy update() och patchar inget globalt flöde.
// Syftet är att samla samma beräkningar som idag sker i legacy update() och i
// update-render-extract-adapter, så att vi senare kan minska dubbelberäkning.

(function initSawViewModel(global) {
  function selectedMode() {
    const el = global.document.getElementById("optimizationMode");
    return el ? el.value : "mixed";
  }

  function currentStepIndexFromState() {
    if (global.SawState && typeof global.SawState.getCurrentStepIndex === "function") {
      return global.SawState.getCurrentStepIndex();
    }
    return typeof global.currentStepIndex === "number" ? global.currentStepIndex : 0;
  }

  function clampStepIndex(index, length) {
    const safeLength = Math.max(0, Number(length) || 0);
    if (safeLength <= 0) return 0;
    return Math.min(Math.max(Number(index) || 0, 0), safeLength - 1);
  }

  function cloneDimensions(list) {
    return (Array.isArray(list) ? list : []).map((d) => ({ ...d }));
  }

  function syncLegacyDimensionsToState() {
    if (!global.SawState || typeof global.SawState.setDimensions !== "function") return;

    try {
      if (typeof dimensions !== "undefined" && Array.isArray(dimensions)) {
        global.SawState.setDimensions(cloneDimensions(dimensions));
      }
    } catch (e) {
      // Ignorera om legacy-bindningen inte är åtkomlig.
    }
  }

  function syncVisibleDimensionsToState() {
    if (typeof global.syncDimensionsStateFromDom === "function") {
      const fromDom = global.syncDimensionsStateFromDom();
      if (Array.isArray(fromDom) && fromDom.length) return fromDom;
    }

    syncLegacyDimensionsToState();
    return global.SawState && typeof global.SawState.getDimensions === "function"
      ? global.SawState.getDimensions()
      : [];
  }

  function calculateMetrics(block, geom, sideYield, packingLayout) {
    if (typeof global.calculateMetrics === "function") {
      return global.calculateMetrics(block, geom, sideYield, packingLayout);
    }

    const sideArea = packingLayout
      ? packingLayout.reduce((sum, r) => sum + (r.w * r.h / 1e6), 0)
      : (sideYield ? sideYield.reduce((sum, s) => sum + (s.width * s.thickness / 1e6), 0) : 0);
    const sawnArea = block ? (block.width * block.height / 1e6 + sideArea) : 0;
    const logArea = geom ? Math.PI * Math.pow((geom.designDiameter || 0) / 2, 2) / 1e6 : 0;
    const yieldPct = block && logArea ? (sawnArea / logArea) * 100 : 0;
    return { sideArea, sawnArea, logArea, yieldPct };
  }

  function setLatestPlans(packingLayout, sawmillCutPlan) {
    if (global.SawState && typeof global.SawState.setLatestPlans === "function") {
      global.SawState.setLatestPlans(packingLayout, sawmillCutPlan);
    }
    if ("latestPackingLayout" in global) global.latestPackingLayout = packingLayout || null;
    if ("latestSawmillCutPlan" in global) global.latestSawmillCutPlan = sawmillCutPlan || null;
  }

  function buildViewModel() {
    if (typeof global.values !== "function") return null;
    if (typeof global.computeGeometry !== "function") return null;
    if (typeof global.findBestCenterBlock !== "function") return null;

    // Under migrationen kan dimensionsdata finnas i tre former:
    // 1. den synliga dimensionslistan i DOM
    // 2. SawState.dimensions
    // 3. legacy `dimensions`
    //
    // Den synliga listan är säkrast som källa vid redigering och prioritet/flytt.
    // Om den inte finns faller vi tillbaka till legacy-listan.
    syncVisibleDimensionsToState();

    const mode = selectedMode();
    const v = global.values();
    const geom = global.computeGeometry(v);
    const block = global.findBestCenterBlock(geom, v);
    const sawList = typeof global.buildSawList === "function"
      ? global.buildSawList(block, geom, v)
      : [];
    const sideYield = typeof global.computeSideYield === "function"
      ? global.computeSideYield(block, geom, v)
      : [];
    const packingLayout = mode === "sawmill" && typeof global.computeSawmillPacking === "function"
      ? global.computeSawmillPacking(geom, v)
      : null;
    const sawmillCutPlan = packingLayout && typeof global.buildSawmillCutPlan === "function"
      ? global.buildSawmillCutPlan(packingLayout, block, geom, v)
      : null;

    setLatestPlans(packingLayout, sawmillCutPlan);

    const activePlan = sawmillCutPlan || sawList;
    const activePlanLength = Array.isArray(activePlan) ? activePlan.length : 0;
    const stepIndex = clampStepIndex(currentStepIndexFromState(), activePlanLength);

    if (global.SawState && typeof global.SawState.setCurrentStepIndex === "function") {
      global.SawState.setCurrentStepIndex(stepIndex);
    }

    const step = activePlanLength ? activePlan[stepIndex] : null;
    const metrics = calculateMetrics(block, geom, sideYield, packingLayout);

    return {
      mode,
      values: v,
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
      step,
      metrics,
    };
  }

  global.SawViewModel = {
    buildViewModel,
    syncLegacyDimensionsToState,
    syncVisibleDimensionsToState,
  };

  global.buildSawViewModel = buildViewModel;
})(window);
