// src/render-timber-canvas.js
// Renderer-wrapper för timmer-/blockningscanvas.
//
// Detta är medvetet bara ett mellanläge. Den anropar legacy
// renderTimberCanvas() om den finns, men ersätter inte funktionen globalt.
// Syftet är att ge timmer-canvasen en modulär ingång utan att riskera att
// återinföra gamla renderbuggar genom att kopiera en stor canvasfunktion.

(function initSawRenderTimberCanvas(global) {
  function syncLegacyCurrentStepIndex(stepIndex) {
    const safeIndex = Math.max(0, Number(stepIndex) || 0);

    // Legacy renderTimberCanvas() läser fortfarande currentStepIndex från app.js.
    // När ren ViewModel-update körs anropas inte legacy update(), så vi speglar
    // SawState/ViewModel-indexet precis innan legacy-canvasen ritas.
    try {
      if (typeof currentStepIndex !== "undefined") {
        currentStepIndex = safeIndex;
      }
    } catch (e) {
      // Ignorera om legacy-bindningen inte är åtkomlig.
    }

    if (typeof global.currentStepIndex === "number") {
      global.currentStepIndex = safeIndex;
    }
  }

  function clearLatestPlansForTimberMode() {
    // Primär källa är SawState. Timmerläge ska inte bära med sig en gammal
    // sågverks-/packningsplan från föregående läge.
    if (global.SawState && typeof global.SawState.clearLatestPlans === "function") {
      global.SawState.clearLatestPlans();
    }

    // Legacy renderTimberCanvas() läser fortfarande latestPackingLayout direkt.
    // Spegla därför rensningen till legacy-globalen tills canvasen är helt
    // extraherad.
    try {
      if (typeof latestPackingLayout !== "undefined") {
        latestPackingLayout = null;
      }
      if (typeof latestSawmillCutPlan !== "undefined") {
        latestSawmillCutPlan = null;
      }
    } catch (e) {
      // Ignorera om legacy-bindningen inte är åtkomlig.
    }

    if ("latestPackingLayout" in global) {
      global.latestPackingLayout = null;
    }
    if ("latestSawmillCutPlan" in global) {
      global.latestSawmillCutPlan = null;
    }
  }

  function renderTimberCanvasFromModule(block, geom, values, sawList, stepIndex) {
    if (typeof global.renderTimberCanvas !== "function") return false;
    syncLegacyCurrentStepIndex(stepIndex);
    clearLatestPlansForTimberMode();
    global.renderTimberCanvas(block, geom, values, sawList);
    return true;
  }

  function renderTimberCanvasFromModel(model) {
    if (!model) return false;
    return renderTimberCanvasFromModule(
      model.block,
      model.geom,
      model.v || model.values,
      model.sawList,
      model.stepIndex
    );
  }

  global.SawRenderTimberCanvas = {
    renderTimberCanvas: renderTimberCanvasFromModule,
    renderTimberCanvasFromModel,
    clearLatestPlansForTimberMode,
  };

  global.renderTimberCanvasFromModule = renderTimberCanvasFromModule;
  global.renderTimberCanvasFromModel = renderTimberCanvasFromModel;
})(window);
