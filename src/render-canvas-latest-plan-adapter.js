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

  function hasArrayItems(value) {
    return Array.isArray(value) && value.length > 0;
  }

  function freshLegacyPlans() {
    if (global.SawLatestPlans && typeof global.SawLatestPlans.fromLegacyGlobals === "function") {
      return global.SawLatestPlans.fromLegacyGlobals();
    }

    return { packingLayout: null, sawmillCutPlan: null };
  }

  function accessorPlans() {
    if (global.SawLatestPlans && typeof global.SawLatestPlans.getLatestPlans === "function") {
      return global.SawLatestPlans.getLatestPlans();
    }

    return { packingLayout: null, sawmillCutPlan: null };
  }

  function currentPlans() {
    const legacyPlans = freshLegacyPlans();
    if (hasArrayItems(legacyPlans.packingLayout)) return legacyPlans;
    return accessorPlans();
  }

  function renderCanvasViaLatestPlans(block, geom, v, sawList) {
    const plans = currentPlans();
    const packingLayout = plans.packingLayout || null;
    const sawmillCutPlan = plans.sawmillCutPlan || null;

    if (hasArrayItems(packingLayout)) {
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
