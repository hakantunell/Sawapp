// src/render-timber-canvas.js
// Renderer-wrapper för timmer-/blockningscanvas.
//
// Detta är medvetet bara ett passivt mellanläge. Den anropar legacy
// renderTimberCanvas() om den finns, men ersätter inte funktionen globalt.
// Syftet är att ge timmer-canvasen en modulär ingång utan att riskera att
// återinföra gamla renderbuggar genom att kopiera en stor canvasfunktion.

(function initSawRenderTimberCanvas(global) {
  function renderTimberCanvasFromModule(block, geom, values, sawList) {
    if (typeof global.renderTimberCanvas !== "function") return false;
    global.renderTimberCanvas(block, geom, values, sawList);
    return true;
  }

  global.SawRenderTimberCanvas = {
    renderTimberCanvas: renderTimberCanvasFromModule,
  };

  global.renderTimberCanvasFromModule = renderTimberCanvasFromModule;
})(window);
