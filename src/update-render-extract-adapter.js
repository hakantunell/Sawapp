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

  const canRenderCalcDetails = typeof global.renderCalcDetails === "function";
  const canRenderMetrics = typeof global.renderMetrics === "function";
  const canRenderBigScreenStep = typeof global.renderBigScreenStep === "function";
  const canRenderSawOrderStatus = typeof global.renderSawOrderStatus === "function";
  const canRenderTimberSawList = typeof global.renderTimberSawList === "function";
  const canRenderTimberCanvas = typeof global.renderTimberCanvasFromModule === "function";
  const canRenderSupportSideView = typeof global.renderSupportSideViewFromModel === "function";
  const canBuildViewModel = typeof global.buildSawViewModel === "function";

  if (!canBuildViewModel) {
    console.warn("buildSawViewModel saknas. update-render-extract-adapter använder inte utbrutna renderers.");
    return;
  }

  if (!canRenderCalcDetails && !canRenderMetrics && !canRenderBigScreenStep && !canRenderSawOrderStatus && !canRenderTimberSawList && !canRenderTimberCanvas && !canRenderSupportSideView) return;

  global.__updateRenderExtractAdapterInstalled = true;
  const legacyUpdate = global.update;

  global.update = function updateWithExtractedRenderers() {
    legacyUpdate.apply(this, arguments);

    const model = global.buildSawViewModel();
    if (!model) return;

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
      global.renderTimberCanvasFromModule(model.block, model.geom, model.v, model.sawList);
    }
  };

  global.update();
})(window);
