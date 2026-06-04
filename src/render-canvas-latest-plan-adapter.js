// src/render-canvas-latest-plan-adapter.js
// Adapter som gör legacy renderCanvas() oberoende av direkta latest*-globals.
//
// Själva canvas-renderingen lämnas oförändrad. Den här adaptern väljer bara
// mellan packningscanvas och timmercavas via SawLatestPlans i stället för att
// renderCanvas() ska läsa latestPackingLayout/latestSawmillCutPlan direkt.

(function installRenderCanvasLatestPlanAdapter(global) {
  if (global.__renderCanvasLatestPlanAdapterInstalled) return;
  if (typeof global.renderCanvas !== "function") return;
  if (typeof global.renderPackingCanvas !== "function") return;
  if (typeof global.renderTimberCanvas !== "function") return;

  global.__renderCanvasLatestPlanAdapterInstalled = true;
  global.renderCanvasLegacyLatestPlanGlobals = global.renderCanvas;

  function latestPlans() {
    if (global.SawLatestPlans && typeof global.SawLatestPlans.getLatestPlans === "function") {
      return global.SawLatestPlans.getLatestPlans();
    }

    return { packingLayout: null, sawmillCutPlan: null };
  }

  global.renderCanvas = function renderCanvasViaLatestPlans(block, geom, v, sawList) {
    const plans = latestPlans();
    const packingLayout = plans.packingLayout || null;
    const sawmillCutPlan = plans.sawmillCutPlan || null;

    if (packingLayout && packingLayout.length) {
      global.renderPackingCanvas(block, geom, v, packingLayout, sawmillCutPlan);
      return;
    }

    global.renderTimberCanvas(block, geom, v, sawList);
  };

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
