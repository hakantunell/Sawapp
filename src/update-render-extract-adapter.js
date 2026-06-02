// src/update-render-extract-adapter.js
// Adapter som aktiverar redan utbrutna renderers utan att ändra legacy app.js.
//
// Detta är ett mellanläge: legacy update() körs först och skriver samma DOM som
// tidigare. Därefter renderar modulerna samma information igen. Syftet är att
// verifiera utbrutna renderers i aktiv drift innan vi senare ersätter inline-koden
// i app.js med direkta funktionsanrop.

(function installUpdateRenderExtractAdapter(global) {
  if (global.__updateRenderExtractAdapterInstalled) return;
  if (typeof global.update !== "function") return;

  const canRenderInputVisibility = typeof global.renderInputVisibility === "function";
  const canRenderPackingCanvas = typeof global.renderPackingCanvas === "function";
  const canRenderSawmillCutPlan = typeof global.renderSawmillCutPlan === "function";
  const canRenderPackingResult = typeof global.renderPackingResult === "function";
  const canRenderSideYield = typeof global.renderSideYield === "function";
  const canRenderCalcDetails = typeof global.renderCalcDetails === "function";
  const canRenderMetrics = typeof global.renderMetrics === "function";
  const canRenderBigScreenStep = typeof global.renderBigScreenStep === "function";
  const canRenderSawOrderStatus = typeof global.renderSawOrderStatus === "function";
  const canRenderTimberSawList = typeof global.renderTimberSawList === "function";
  const canRenderTimberCanvas = typeof global.renderTimberCanvasFromModel === "function";
  const canRenderSupportSideView = typeof global.renderSupportSideViewFromModel === "function";
  const canBuildViewModel = typeof global.buildSawViewModel === "function";

  if (!canBuildViewModel) {
    console.warn("buildSawViewModel saknas. update-render-extract-adapter använder inte utbrutna renderers.");
    return;
  }

  if (!canRenderInputVisibility && !canRenderPackingCanvas && !canRenderSawmillCutPlan && !canRenderPackingResult && !canRenderSideYield && !canRenderCalcDetails && !canRenderMetrics && !canRenderBigScreenStep && !canRenderSawOrderStatus && !canRenderTimberSawList && !canRenderTimberCanvas && !canRenderSupportSideView) return;

  global.__updateRenderExtractAdapterInstalled = true;
  const legacyUpdate = global.update;

  global.update = function updateWithExtractedRenderers() {
    legacyUpdate.apply(this, arguments);

    const model = global.buildSawViewModel();
    if (!model) return;

    if (canRenderInputVisibility) {
      global.renderInputVisibility();
    }

    if (model.mode === "sawmill") {
      if (canRenderPackingCanvas && model.packingLayout) {
        global.renderPackingCanvas(
          model.block,
          model.geom,
          model.v,
          model.packingLayout,
          model.sawmillCutPlan,
          model.stepIndex
        );
      }

      if (canRenderSawmillCutPlan && model.sawmillCutPlan) {
        global.renderSawmillCutPlan(model.sawmillCutPlan);
      }

      if (canRenderPackingResult) {
        global.renderPackingResult(model.packingLayout);
      }
    } else if (canRenderSideYield) {
      global.renderSideYield(model.sideYield);
    }

    if (canRenderMetrics) {
      global.renderMetrics(model.geom, model.metrics);
    }

    if (canRenderCalcDetails) {
      global.renderCalcDetails(model.geom, model.block, model.v);
    }

    if (canRenderBigScreenStep && model.step) {
      global.renderBigScreenStep(model.step);
    }

    if (canRenderSawOrderStatus) {
      global.renderSawOrderStatus(model);
    }

    if (canRenderSupportSideView) {
      global.renderSupportSideViewFromModel(model);
    }

    if (canRenderTimberSawList && model.mode !== "sawmill" && model.sawList) {
      global.renderTimberSawList(model.sawList);
    }

    if (canRenderTimberCanvas && model.mode !== "sawmill" && model.sawList) {
      global.renderTimberCanvasFromModel(model);
    }
  };

  global.update();
})(window);
