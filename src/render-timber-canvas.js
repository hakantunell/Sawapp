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

  function clearLegacyPackingLayoutForTimberMode() {
    // Legacy renderTimberCanvas() ritar packningslayout om latestPackingLayout är
    // satt. I ren ViewModel-väg måste timmerläge säkra att den gamla sågverks-
    // layouten inte ligger kvar från föregående läge.
    try {
      if (typeof latestPackingLayout !== "undefined") {
        latestPackingLayout = null;
      }
    } catch (e) {
      // Ignorera om legacy-bindningen inte är åtkomlig.
    }

    if ("latestPackingLayout" in global) {
      global.latestPackingLayout = null;
    }
  }

  function renderTimberCanvasFromModule(block, geom, values, sawList, stepIndex) {
    if (typeof global.renderTimberCanvas !== "function") return false;
    syncLegacyCurrentStepIndex(stepIndex);
    clearLegacyPackingLayoutForTimberMode();
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
  };

  global.renderTimberCanvasFromModule = renderTimberCanvasFromModule;
  global.renderTimberCanvasFromModel = renderTimberCanvasFromModel;
})(window);
