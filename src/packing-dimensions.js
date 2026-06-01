// src/packing-dimensions.js
// Hjälpfunktioner för packnings-/sågverksdimensioner.
//
// Detta är ren packningslogik utan DOM-rendering, canvas, currentStepIndex,
// stödberäkning eller rotations-/svärdspositionering.
// Modulen är inte aktiv förrän adapter laddas separat.

(function initSawPackingDimensions(global) {
  function effectiveAllowedWaneForDimension(d, v) {
    if (global.SawWane && typeof global.SawWane.effectiveAllowedWaneForDimension === "function") {
      return global.SawWane.effectiveAllowedWaneForDimension(d, v);
    }

    const dim = d || {};
    const values = v || {};
    const perDimension = (dim.waneMm || 0) * Math.SQRT2;
    const fromProfile = (values.profileRadius || 0) * 0.4;
    const wildDefault = dim.wildEdge ? 20 * Math.SQRT2 : 0;
    return Math.max(perDimension, fromProfile, wildDefault);
  }

  function activePackingDimensionsFromList(dimensions) {
    return (Array.isArray(dimensions) ? dimensions : [])
      .filter(d => d.active)
      .map((d, index) => ({ ...d, priorityIndex: index }))
      .filter(d => {
        if (d.type === "fixed") return d.width > 0 && d.height > 0;
        if (d.type === "freeWidth") return d.height > 0;
        if (d.type === "minWidth") return d.height > 0 && (d.minWidth || d.width || 0) > 0;
        return false;
      });
  }

  function activePackingDimensionsFromGlobal() {
    return activePackingDimensionsFromList(global.dimensions);
  }

  function circleWidthAtY(y, R) {
    if (Math.abs(y) > R) return 0;
    return 2 * Math.sqrt(Math.max(0, R * R - y * y));
  }

  function dimensionToPackCandidate(d, geom, v) {
    if (!d || !geom) return null;

    const allowedWane = effectiveAllowedWaneForDimension(d, v);

    if (d.type === "fixed") {
      return {
        source: d,
        w: d.width,
        h: d.height,
        label: `${d.width}×${d.height}${d.wildEdge ? " R" : ""}`,
        allowedWane,
        type: d.type,
        priorityIndex: d.priorityIndex,
      };
    }

    if (d.type === "freeWidth") {
      return {
        source: d,
        w: Math.floor(geom.usableDiameter),
        h: d.height,
        label: `${d.height}×*${d.wildEdge ? " R" : ""}`,
        allowedWane,
        type: d.type,
        priorityIndex: d.priorityIndex,
        freeWidth: true,
        minWidth: 1,
      };
    }

    if (d.type === "minWidth") {
      const minWidth = d.minWidth || d.width || 0;
      return {
        source: d,
        w: Math.floor(geom.usableDiameter),
        h: d.height,
        label: `${d.height}×${minWidth}+${d.wildEdge ? " R" : ""}`,
        allowedWane,
        type: d.type,
        priorityIndex: d.priorityIndex,
        freeWidth: true,
        minWidth,
      };
    }

    return null;
  }

  function rectFitsCircle(rect, R, allowedWane = 0) {
    if (!rect) return false;
    const corners = [
      [rect.x, rect.y],
      [rect.x + rect.w, rect.y],
      [rect.x, rect.y + rect.h],
      [rect.x + rect.w, rect.y + rect.h],
    ];
    const allowedR = R + allowedWane;
    return corners.every(([x, y]) => Math.hypot(x, y) <= allowedR + 0.001);
  }

  global.SawPackingDimensions = {
    activePackingDimensionsFromList,
    activePackingDimensionsFromGlobal,
    circleWidthAtY,
    dimensionToPackCandidate,
    rectFitsCircle,
  };
})(window);
