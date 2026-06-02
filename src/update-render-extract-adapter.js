// src/update-render-extract-adapter.js
// Adapter som aktiverar redan utbrutna renderers utan att ändra legacy app.js.
//
// Detta är ett mellanläge: legacy update() körs först och skriver samma DOM som
// tidigare. Därefter renderar modulerna samma information igen. Syftet är att
// verifiera renderCalcDetails()/renderMetrics() i aktiv drift innan vi senare
// ersätter inline-koden i app.js med direkta funktionsanrop.

(function installUpdateRenderExtractAdapter(global) {
  if (global.__updateRenderExtractAdapterInstalled) return;
  if (typeof global.update !== "function") return;

  const canRenderCalcDetails = typeof global.renderCalcDetails === "function";
  const canRenderMetrics = typeof global.renderMetrics === "function" && typeof global.calculateMetrics === "function";

  if (!canRenderCalcDetails && !canRenderMetrics) return;

  global.__updateRenderExtractAdapterInstalled = true;
  const legacyUpdate = global.update;

  function selectedMode() {
    const el = global.document.getElementById("optimizationMode");
    return el ? el.value : "mixed";
  }

  function recomputeViewModel() {
    if (typeof global.values !== "function") return null;
    if (typeof global.computeGeometry !== "function") return null;
    if (typeof global.findBestCenterBlock !== "function") return null;

    const v = global.values();
    const geom = global.computeGeometry(v);
    const block = global.findBestCenterBlock(geom, v);
    const sideYield = typeof global.computeSideYield === "function"
      ? global.computeSideYield(block, geom, v)
      : [];
    const packingLayout = selectedMode() === "sawmill" && typeof global.computeSawmillPacking === "function"
      ? global.computeSawmillPacking(geom, v)
      : null;

    return { v, geom, block, sideYield, packingLayout };
  }

  global.update = function updateWithExtractedRenderers() {
    legacyUpdate.apply(this, arguments);

    const model = recomputeViewModel();
    if (!model) return;

    if (canRenderMetrics) {
      const metrics = global.calculateMetrics(model.block, model.geom, model.sideYield, model.packingLayout);
      global.renderMetrics(model.geom, metrics);
    }

    if (canRenderCalcDetails) {
      global.renderCalcDetails(model.geom, model.block, model.v);
    }
  };

  global.update();
})(window);
