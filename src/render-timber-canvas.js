// src/render-timber-canvas.js
// Renderer-wrapper för timmer-/blockningscanvas.
//
// Detta är medvetet bara ett mellanläge. Den anropar legacy
// renderTimberCanvas() om den finns, men ersätter inte funktionen globalt.
// Syftet är att ge timmer-canvasen en modulär ingång utan att riskera att
// återinföra gamla renderbuggar genom att kopiera en stor canvasfunktion.

(function initSawRenderTimberCanvas(global) {
  function renderTimberCanvasFromModule(block, geom, values, sawList) {
    if (typeof global.renderTimberCanvas !== "function") return false;
    global.renderTimberCanvas(block, geom, values, sawList);
    return true;
  }

  function renderTimberCanvasFromModel(model) {
    if (!model) return false;
    return renderTimberCanvasFromModule(model.block, model.geom, model.v || model.values, model.sawList);
  }

  global.SawRenderTimberCanvas = {
    renderTimberCanvas: renderTimberCanvasFromModule,
    renderTimberCanvasFromModel,
  };

  global.renderTimberCanvasFromModule = renderTimberCanvasFromModule;
  global.renderTimberCanvasFromModel = renderTimberCanvasFromModel;
})(window);
