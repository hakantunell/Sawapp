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
  const canRenderMetrics = typeof global.renderMetrics === "function" && typeof global.calculateMetrics === "function";
  const canRenderBigScreenStep = typeof global.renderBigScreenStep === "function";
  const canRenderSawOrderStatus = typeof global.renderSawOrderStatus === "function";
  const canRenderTimberSawList = typeof global.renderTimberSawList === "function" && typeof global.buildSawList === "function";

  if (!canRenderCalcDetails && !canRenderMetrics && !canRenderBigScreenStep && !canRenderSawOrderStatus && !canRenderTimberSawList) return;

  global.__updateRenderExtractAdapterInstalled = true;
  const legacyUpdate = global.update;

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

  function latestSawmillCutPlanFromState() {
    if (global.SawState && typeof global.SawState.getLatestSawmillCutPlan === "function") {
      return global.SawState.getLatestSawmillCutPlan();
    }
    return global.latestSawmillCutPlan || null;
  }

  function currentPlanStep() {
    const plan = latestSawmillCutPlanFromState();
    const idx = currentStepIndexFromState();
    return Array.isArray(plan) && plan.length ? plan[Math.min(Math.max(idx, 0), plan.length - 1)] : null;
  }

  function recomputeViewModel() {
    if (typeof global.values !== "function") return null;
    if (typeof global.computeGeometry !== "function") return null;
    if (typeof global.findBestCenterBlock !== "function") return null;

    const mode = selectedMode();
    const v = global.values();
    const geom = global.computeGeometry(v);
    const block = global.findBestCenterBlock(geom, v);
    const sideYield = typeof global.computeSideYield === "function"
      ? global.computeSideYield(block, geom, v)
      : [];
    const packingLayout = mode === "sawmill" && typeof global.computeSawmillPacking === "function"
      ? global.computeSawmillPacking(geom, v)
      : null;
    const timberSawList = mode !== "sawmill" && canRenderTimberSawList
      ? global.buildSawList(block, geom, v)
      : null;

    return {
      mode,
      v,
      geom,
      block,
      sideYield,
      packingLayout,
      timberSawList,
      sawmillCutPlan: latestSawmillCutPlanFromState(),
      step: currentPlanStep(),
    };
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

    if (canRenderBigScreenStep && model.step) {
      global.renderBigScreenStep(model.step);
    }

    if (canRenderSawOrderStatus) {
      global.renderSawOrderStatus(model);
    }

    if (canRenderTimberSawList && model.mode !== "sawmill" && model.timberSawList) {
      global.renderTimberSawList(model.timberSawList);
    }
  };

  global.update();
})(window);
