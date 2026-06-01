// src/dimension-label.js
// Formatterar dimensionsrader till korta etiketter.
//
// Ren text-/label-logik. Påverkar inte beräkning, rendering, kerf, rotation eller state.

(function initSawDimensionLabel(global) {
  function dimensionLabel(d) {
    const dim = d || {};
    const w = dim.waneMm ? ` v${dim.waneMm}` : "";

    if (dim.type === "freeWidth") {
      return `${dim.height} × *${dim.wildEdge ? " R" : ""}${w}`;
    }

    if (dim.type === "minWidth") {
      return `${dim.height} × ${dim.minWidth}+${dim.wildEdge ? " R" : ""}${w}`;
    }

    return `${dim.width} × ${dim.height}${dim.wildEdge ? " R" : ""}${w}`;
  }

  global.SawDimensionLabel = {
    dimensionLabel,
  };
})(window);
