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

  global.renderCanvas = function renderCanvasViaLatestPlans(block, geom, v, sawList) {
    if (hasPackingLayout()) {
      const packingLayout = latestPackingLayout();
      const sawmillCutPlan = latestSawmillCutPlan();

      global.renderPackingCanvas(block, geom, v, packingLayout, sawmillCutPlan);
      return;
    }

    global.renderTimberCanvas(block, geom, v, sawList);
  };

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
