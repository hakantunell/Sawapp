// src/render-packing-adapter.js
// Adapter för att låta legacy app.js använda den utbrutna packningsrenderaren.
//
// Den här filen laddas efter legacy app.js och efter src/render-packing-canvas.js.
// Den sparar den gamla renderPackingCanvas som fallback och ersätter sedan global
// renderPackingCanvas med modulens implementation.

(function installRenderPackingAdapter(global) {
  if (!global.SawRenderPacking || typeof global.SawRenderPacking.renderPackingCanvas !== "function") {
    console.warn("SawRenderPacking saknas. renderPackingCanvas lämnas oförändrad.");
    return;
  }

  if (typeof global.renderPackingCanvas === "function") {
    global.renderPackingCanvasLegacy = global.renderPackingCanvas;
  }

  global.renderPackingCanvas = global.SawRenderPacking.renderPackingCanvas;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
