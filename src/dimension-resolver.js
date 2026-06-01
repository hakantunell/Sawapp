// src/dimension-resolver.js
// Resolverar dimensionsrader till konkreta kandidater.
//
// Detta är ren dimensioneringslogik. Den använder SawWane för vankants-/diagonalkrav.
// Modulen är inte aktiv förrän adapter laddas separat.

(function initSawDimensionResolver(global) {
  function requiredDiagonalWithWane(width, height, allowedCornerWane) {
    if (global.SawWane && typeof global.SawWane.requiredDiagonalWithWane === "function") {
      return global.SawWane.requiredDiagonalWithWane(width, height, allowedCornerWane);
    }
    return Math.max(0, Math.hypot(width, height) - 2 * allowedCornerWane);
  }

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

  function maxFreeWidthForThickness(thickness, geom, allowedWane) {
    if (global.SawWane && typeof global.SawWane.maxFreeWidthForThickness === "function") {
      return global.SawWane.maxFreeWidthForThickness(thickness, geom, allowedWane);
    }

    const geometry = geom || {};
    const availableDiag = (geometry.usableDiameter || 0) + 2 * (allowedWane || 0);
    return Math.floor(Math.sqrt(Math.max(0, availableDiag * availableDiag - thickness * thickness)));
  }

  function resolveDimensionCandidate(d, geom, v) {
    if (!d || !geom) return null;

    const allowedWane = effectiveAllowedWaneForDimension(d, v);

    if (d.type === "freeWidth") {
      const thickness = d.height;
      const computedWidth = maxFreeWidthForThickness(thickness, geom, allowedWane);
      if (computedWidth <= 0) return null;
      return {
        ...d,
        width: computedWidth,
        height: thickness,
        computedWidth,
        allowedWane,
        diagonal: Math.hypot(computedWidth, thickness),
        requiredDiagonal: requiredDiagonalWithWane(computedWidth, thickness, allowedWane),
        resolvedLabel: `${thickness} × ${computedWidth}${d.wildEdge ? " R" : ""}`,
      };
    }

    if (d.type === "minWidth") {
      const thickness = d.height;
      const minWidth = d.minWidth || d.width || 0;
      const computedWidth = maxFreeWidthForThickness(thickness, geom, allowedWane);
      if (computedWidth < minWidth) return null;
      return {
        ...d,
        width: computedWidth,
        height: thickness,
        minWidth,
        computedWidth,
        allowedWane,
        diagonal: Math.hypot(computedWidth, thickness),
        requiredDiagonal: requiredDiagonalWithWane(computedWidth, thickness, allowedWane),
        resolvedLabel: `${thickness} × ${computedWidth}${d.wildEdge ? " R" : ""}`,
      };
    }

    const requiredDiagonal = requiredDiagonalWithWane(d.width, d.height, allowedWane);
    if (requiredDiagonal > (geom.usableDiameter || 0) + 0.5) return null;
    return {
      ...d,
      allowedWane,
      diagonal: Math.hypot(d.width, d.height),
      requiredDiagonal,
      resolvedLabel: `${d.width} × ${d.height}${d.wildEdge ? " R" : ""}`,
    };
  }

  global.SawDimensionResolver = {
    resolveDimensionCandidate,
  };
})(window);
