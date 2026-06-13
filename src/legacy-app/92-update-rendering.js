// src/legacy-app/92-update-rendering.js
// Samlad rendering för legacy update-flödet.

(function initSawUpdateRendering(global) {
  function hasItems(value) {
    return Array.isArray(value) && value.length > 0;
  }

  function renderCanvasForContext(context) {
    if (!context) return;

    // Packningsläge måste ritas direkt från den aktuella kontexten.
    // Annars kan latest-plan-adaptern falla tillbaka till vanlig timmercanvas,
    // vilket gör att svärdslinjen hamnar enligt 4-stegs blockningsplanen medan
    // själva nästa-steget ändå använder packningsplanen.
    if (hasItems(context.packingLayout) && typeof global.renderPackingCanvas === "function") {
      global.renderPackingCanvas(
        context.block,
        context.geom,
        context.v,
        context.packingLayout,
        context.sawmillCutPlan,
        context.stepIndex
      );
      return;
    }

    if (global.SawRenderCanvasLatestPlanAdapter && typeof global.SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans === "function") {
      global.SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans(context.block, context.geom, context.v, context.sawList);
      return;
    }

    if (typeof global.renderTimberCanvas === "function") {
      global.renderTimberCanvas(context.block, context.geom, context.v, context.sawList);
    }
  }

  function renderSupportForContext(context) {
    if (!context || typeof global.renderSupportSideView !== "function") return;

    const step = context.step || (context.activePlan && context.activePlan[0]);
    if (step) global.renderSupportSideView(step, context.geom);
  }

  function setLatestPlans(context) {
    if (!context) return;

    if (global.SawLatestPlans && typeof global.SawLatestPlans.setLatestPlans === "function") {
      global.SawLatestPlans.setLatestPlans(context.packingLayout, context.sawmillCutPlan);
    }
  }

  function renderYieldResults(context) {
    if (!context) return;

    if (context.packingLayout) {
      if (typeof global.renderPackingResult === "function") global.renderPackingResult(context.packingLayout);
      return;
    }

    if (typeof global.renderSideYield === "function") global.renderSideYield(context.sideYield);
  }

  function renderPlanTable(context) {
    if (!context) return;

    if (typeof global.renderSawmillCutPlan === "function" && global.renderSawmillCutPlan(context.sawmillCutPlan)) {
      return;
    }

    if (typeof global.renderSawList === "function") {
      global.renderSawList(context.sawList);
    } else if (global.SawRenderTimberSawList && typeof global.SawRenderTimberSawList.renderTimberSawList === "function") {
      global.SawRenderTimberSawList.renderTimberSawList(context.sawList);
    }
  }

  function renderBigStep(context) {
    if (!context || typeof global.renderBigScreenStep !== "function") return;
    global.renderBigScreenStep(context.step || (context.activePlan && context.activePlan[0]));
  }

  function renderSummary(context) {
    if (!context) return;

    if (typeof global.renderMetrics === "function") {
      global.renderMetrics(context.geom, context.metrics);
      return;
    }

    if (!context.geom || !context.metrics || !global.$) return;
    global.$("designDiameter").textContent = global.fmtMm(context.geom.designDiameter, 0);
    global.$("usableDiameter").textContent = global.fmtMm(context.geom.usableDiameter, 0);
    global.$("yieldPct").textContent = `${context.metrics.yieldPct.toFixed(1)} %`;
    global.$("sawnArea").textContent = `${context.metrics.sawnArea.toFixed(3)} m²`;
    global.$("logVolume").textContent = `${context.geom.logVolume.toFixed(3)} m³`;
  }

  function renderCalcDetailsForContext(context) {
    if (!context) return;

    if (typeof global.renderCalcDetails === "function") {
      global.renderCalcDetails(context.geom, context.block, context.v);
    }
  }

  function renderOrderStatus(context) {
    if (!context) return;

    if (typeof global.renderSawOrderStatus === "function") {
      return global.renderSawOrderStatus(context);
    }

    return false;
  }

  function renderAll(context) {
    setLatestPlans(context);
    renderSupportForContext(context);
    renderCalcDetailsForContext(context);
    renderYieldResults(context);
    renderCanvasForContext(context);
    renderPlanTable(context);
    renderBigStep(context);
  }

  global.SawUpdateRendering = {
    renderSummary,
    renderOrderStatus,
    renderAll,
    renderCanvasForContext,
    renderSupportForContext,
    renderYieldResults,
    renderPlanTable,
    renderBigStep,
    renderCalcDetailsForContext,
  };
})(window);