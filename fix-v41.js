// fix-v41.js
// Filtrerar bort vildmarkspanel i packningsläge när råkantssidan blir för smal.

(function installWildEdgeSidePanelFilter(global) {
  if (typeof global.computeSawmillPacking !== "function") return;

  const previousComputeSawmillPacking = global.computeSawmillPacking;

  function parseNominalWidth(rect) {
    const label = String(rect && rect.label || "");
    const match = label.match(/×\s*(\d+)/);
    return match ? Number(match[1]) : Math.max(Number(rect && rect.w) || 0, Number(rect && rect.h) || 0);
  }

  function minRequiredRawWidth(rect) {
    const nominal = parseNominalWidth(rect);
    return Math.max(70, Math.round(nominal * 0.7));
  }

  function chordWidthAtY(y, R) {
    if (Math.abs(y) >= R) return 0;
    return 2 * Math.sqrt(Math.max(0, R * R - y * y));
  }

  function chordHeightAtX(x, R) {
    if (Math.abs(x) >= R) return 0;
    return 2 * Math.sqrt(Math.max(0, R * R - x * x));
  }

  function rawEdgeWidth(rect, geom) {
    const side = String(rect.side || "");
    const R = Number(geom && geom.usableDiameter) / 2;
    if (!Number.isFinite(R) || R <= 0) return Infinity;

    if (side === "över") return chordWidthAtY(rect.y, R);
    if (side === "under") return chordWidthAtY(rect.y + rect.h, R);
    if (side === "vänster") return chordHeightAtX(rect.x, R);
    if (side === "höger") return chordHeightAtX(rect.x + rect.w, R);
    return Infinity;
  }

  function hasEnoughRawEdge(rect, geom) {
    if (!rect || !rect.wildEdge || rect.type === "center") return true;
    return rawEdgeWidth(rect, geom) + 0.001 >= minRequiredRawWidth(rect);
  }

  global.computeSawmillPacking = function computeSawmillPackingWithWildEdgeFilter(geom, values) {
    const packing = previousComputeSawmillPacking(geom, values);
    if (!Array.isArray(packing)) return packing;
    return packing.filter((rect) => hasEnoughRawEdge(rect, geom));
  };
})(window);