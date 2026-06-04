// src/render-canvas-latest-plan-adapter.js
// Ersätter legacy renderCanvas() med en SawLatestPlans-baserad variant.
//
// app.js innehåller fortfarande en äldre renderCanvas() som läser
// latestPackingLayout/latestSawmillCutPlan direkt. Under migrationen låter vi den
// funktionen finnas kvar, men den används inte efter att denna adapter har laddats.
// När app.js kan ändras kirurgiskt kan legacy-funktionen ersättas helt och denna
// adapter tas bort.

(function installRenderCanvasLatestPlanAdapter(global) {
  if (global.__renderCanvasLatestPlanAdapterInstalled) return;
  if (typeof global.renderCanvas !== "function") return;
  if (typeof global.renderPackingCanvas !== "function") return;
  if (typeof global.renderTimberCanvas !== "function") return;

  global.__renderCanvasLatestPlanAdapterInstalled = true;
  global.renderCanvasLegacyLatestPlanGlobals = global.renderCanvas;

  function hasPackingLayout() {
    if (global.SawLatestPlans && typeof global.SawLatestPlans.hasPackingLayout === "function") {
      return global.SawLatestPlans.hasPackingLayout();
    }

    return false;
  }

  function latestPackingLayout() {
    if (global.SawLatestPlans && typeof global.SawLatestPlans.getPackingLayout === "function") {
      return global.SawLatestPlans.getPackingLayout();
    }

    return null;
  }

  function latestSawmillCutPlan() {
    if (global.SawLatestPlans && typeof global.SawLatestPlans.getSawmillCutPlan === "function") {
      return global.SawLatestPlans.getSawmillCutPlan();
    }

    return null;
  }

  function renderCanvasViaLatestPlans(block, geom, v, sawList) {
    if (hasPackingLayout()) {
      const packingLayout = latestPackingLayout();
      const sawmillCutPlan = latestSawmillCutPlan();

      global.renderPackingCanvas(block, geom, v, packingLayout, sawmillCutPlan);
      return;
    }

    global.renderTimberCanvas(block, geom, v, sawList);
  }

  global.renderCanvas = renderCanvasViaLatestPlans;

  global.SawRenderCanvasLatestPlanAdapter = {
    renderCanvasViaLatestPlans,
  };

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
