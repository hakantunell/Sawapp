// src/dimensions.js
// Dimensions- och vankantslogik för Sawapp.
//
// Detta är andra riktiga modulsteget i refaktoreringen.
// Modulen är avsedd att ersätta rena dimensionsfunktioner från legacy app.js
// utan att röra sågplan, kerf eller rendering.

(function initSawDimensions(global) {
  const geometry = global.SawGeometry;

  function dimensionLabel(d) {
    const w = d.waneMm ? ` v${d.waneMm}` : "";
    if (d.type === "freeWidth") return `${d.height} × *${d.wildEdge ? " R" : ""}${w}`;
    if (d.type === "minWidth") return `${d.height} × ${d.minWidth}+${d.wildEdge ? " R" : ""}${w}`;
    return `${d.width} × ${d.height}${d.wildEdge ? " R" : ""}${w}`;
  }

  function effectiveAllowedWaneForDimension(d, v) {
    const perDimension = (d.waneMm || 0) * Math.SQRT2;
    const fromProfile = (v.profileRadius || 0) * 0.4;
    const wildDefault = d.wildEdge ? 20 * Math.SQRT2 : 0;
    return Math.max(perDimension, fromProfile, wildDefault);
  }

  function effectiveCornerWane(v) {
    return Math.max((v.cornerWane || 0) * Math.SQRT2, (v.profileRadius || 0) * 0.4);
  }

  function requiredDiagonalWithWane(width, height, allowedCornerWane) {
    if (geometry?.requiredDiagonalWithWane) {
      return geometry.requiredDiagonalWithWane(width, height, allowedCornerWane);
    }
    return Math.max(0, Math.hypot(width, height) - 2 * allowedCornerWane);
  }

  function maxFreeWidthForThickness(thickness, geom, allowedWane) {
    if (geometry?.maxFreeWidthForThickness) {
      return geometry.maxFreeWidthForThickness(thickness, geom, allowedWane);
    }
    const availableDiag = geom.usableDiameter + 2 * allowedWane;
    return Math.floor(Math.sqrt(Math.max(0, availableDiag * availableDiag - thickness * thickness)));
  }

  function resolveDimensionCandidate(d, geom, v) {
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
    if (requiredDiagonal > geom.usableDiameter + 0.5) return null;
    return {
      ...d,
      allowedWane,
      diagonal: Math.hypot(d.width, d.height),
      requiredDiagonal,
      resolvedLabel: `${d.width} × ${d.height}${d.wildEdge ? " R" : ""}`,
    };
  }

  function findBestCenterBlock(dimensions, geom, v, mode) {
    let active = dimensions.filter(d => d.active);

    if (mode === "timber") active = active.filter(d => d.type === "fixed");
    if (mode === "plank") active = active.filter(d => d.type === "freeWidth");
    if (mode === "panel") active = active.filter(d => d.type === "minWidth" || d.wildEdge);

    for (const d of active) {
      const candidate = resolveDimensionCandidate(d, geom, v);
      if (candidate) return { ...candidate, resultType: candidate.type || "fixed" };
    }
    return null;
  }

  global.SawDimensions = {
    dimensionLabel,
    effectiveAllowedWaneForDimension,
    effectiveCornerWane,
    requiredDiagonalWithWane,
    maxFreeWidthForThickness,
    resolveDimensionCandidate,
    findBestCenterBlock,
  };
})(window);
