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

  function minRequiredRawDepth(rect) {
    const nominal = parseNominalWidth(rect);
    return Math.max(50, Math.round(nominal * 0.5));
  }

  function rawDepthAtHorizontalEnd(rect, R, topSide) {
    const innerY = topSide ? rect.y + rect.h : rect.y;
    const xs = [rect.x, rect.x + rect.w];
    let minDepth = Infinity;
    for (const x of xs) {
      if (Math.abs(x) >= R) return 0;
      const circleY = Math.sqrt(Math.max(0, R * R - x * x));
      const rawY = topSide ? -circleY : circleY;
      const depth = Math.abs(innerY - rawY);
      minDepth = Math.min(minDepth, depth);
    }
    return Number.isFinite(minDepth) ? minDepth : 0;
  }

  function rawDepthAtVerticalEnd(rect, R, leftSide) {
    const innerX = leftSide ? rect.x + rect.w : rect.x;
    const ys = [rect.y, rect.y + rect.h];
    let minDepth = Infinity;
    for (const y of ys) {
      if (Math.abs(y) >= R) return 0;
      const circleX = Math.sqrt(Math.max(0, R * R - y * y));
      const rawX = leftSide ? -circleX : circleX;
      const depth = Math.abs(innerX - rawX);
      minDepth = Math.min(minDepth, depth);
    }
    return Number.isFinite(minDepth) ? minDepth : 0;
  }

  function hasEnoughRawEdge(rect, geom) {
    if (!rect || !rect.wildEdge || rect.type === "center") return true;
    const side = String(rect.side || "");
    const R = Number(geom && geom.usableDiameter) / 2;
    if (!Number.isFinite(R) || R <= 0) return true;

    let rawDepth = Infinity;
    if (side === "över") rawDepth = rawDepthAtHorizontalEnd(rect, R, true);
    else if (side === "under") rawDepth = rawDepthAtHorizontalEnd(rect, R, false);
    else if (side === "vänster") rawDepth = rawDepthAtVerticalEnd(rect, R, true);
    else if (side === "höger") rawDepth = rawDepthAtVerticalEnd(rect, R, false);
    else return true;

    return rawDepth + 0.001 >= minRequiredRawDepth(rect);
  }

  global.computeSawmillPacking = function computeSawmillPackingWithWildEdgeFilter(geom, values) {
    const packing = previousComputeSawmillPacking(geom, values);
    if (!Array.isArray(packing)) return packing;
    return packing.filter((rect) => hasEnoughRawEdge(rect, geom));
  };
})(window);
