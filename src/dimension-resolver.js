// src/dimension-resolver.js
// Resolverar dimensionsrader till konkreta kandidater och väljer centrumblock.
//
// Detta är ren dimensioneringslogik. Den använder SawWane för vankants-/diagonalkrav.
// Delar av modulen aktiveras via adapter i separata steg.

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

  function lengthRequirementPct(d) {
    const pct = Number(d && d.lengthPct);
    if (!Number.isFinite(pct) || pct <= 0) return 100;
    return Math.max(1, Math.min(100, pct));
  }

  function diameterAtLengthRequirement(geom, v, d) {
    const length = Math.max(0, Number(v && v.logLength) || 0);
    const pct = lengthRequirementPct(d);
    const requiredLength = length * pct / 100;

    const root = Number(geom && geom.rootEnd);
    const top = Number(geom && geom.topEnd);
    const fallback = Number(geom && geom.minEnd) || Number(geom && geom.designDiameter) || 0;

    if (!length || !Number.isFinite(root) || !Number.isFinite(top)) {
      return { diameter: fallback, requiredLength, lengthPct: pct };
    }

    // Antag linjär avsmalning. För en viss längdandel använder vi den grövre änden
    // och räknar diameter vid slutet av den godkända delen. Vid 100 % blir detta
    // samma sak som minsta änddiametern.
    const t = Math.max(0, Math.min(1, requiredLength / length));
    const diameter = root >= top
      ? root + (top - root) * t
      : top + (root - top) * t;

    return { diameter, requiredLength, lengthPct: pct };
  }

  function usableDiameterAtLengthRequirement(geom, v, d) {
    const info = diameterAtLengthRequirement(geom, v, d);
    const values = v || {};
    return {
      ...info,
      usableDiameter: Math.max(0, info.diameter - 2 * (values.sweep || 0) - 2 * ((values.bark || 0) + (values.margin || 0))),
    };
  }

  function usableLengthForRequiredDiagonal(requiredDiagonal, allowedWane, geom, v) {
    const length = Math.max(0, Number(v && v.logLength) || 0);
    const root = Number(geom && geom.rootEnd);
    const top = Number(geom && geom.topEnd);
    if (!length || !Number.isFinite(root) || !Number.isFinite(top)) return length;

    const values = v || {};
    const neededDiameter = Math.max(0, requiredDiagonal - 2 * (allowedWane || 0)) + 2 * (values.sweep || 0) + 2 * ((values.bark || 0) + (values.margin || 0));
    const thick = Math.max(root, top);
    const thin = Math.min(root, top);

    if (thin + 0.5 >= neededDiameter) return length;
    if (thick + 0.5 < neededDiameter) return 0;
    if (Math.abs(thick - thin) < 0.001) return 0;

    const fraction = (thick - neededDiameter) / (thick - thin);
    return Math.max(0, Math.min(length, fraction * length));
  }

  function maxFreeWidthForThickness(thickness, geom, allowedWane, availableDiameter) {
    if (availableDiameter === undefined && global.SawWane && typeof global.SawWane.maxFreeWidthForThickness === "function") {
      return global.SawWane.maxFreeWidthForThickness(thickness, geom, allowedWane);
    }

    const geometry = geom || {};
    const usable = availableDiameter !== undefined ? availableDiameter : (geometry.usableDiameter || 0);
    const availableDiag = usable + 2 * (allowedWane || 0);
    return Math.floor(Math.sqrt(Math.max(0, availableDiag * availableDiag - thickness * thickness)));
  }

  function candidateLengthFields(d, geom, v, requiredDiagonal, allowedWane) {
    const pct = lengthRequirementPct(d);
    const logLength = Math.max(0, Number(v && v.logLength) || 0);
    const requiredLength = logLength * pct / 100;
    const usableLength = usableLengthForRequiredDiagonal(requiredDiagonal, allowedWane, geom, v);
    return {
      lengthPct: pct,
      lengthRequirementPct: pct,
      requiredLengthMm: requiredLength,
      usableLengthMm: usableLength,
      usableLengthOk: usableLength + 0.5 >= requiredLength,
    };
  }

  function resolveDimensionCandidate(d, geom, v) {
    if (!d || !geom) return null;

    const allowedWane = effectiveAllowedWaneForDimension(d, v);
    const lengthDiameter = usableDiameterAtLengthRequirement(geom, v, d);

    if (d.type === "freeWidth") {
      const thickness = d.height;
      const computedWidth = maxFreeWidthForThickness(thickness, geom, allowedWane, lengthDiameter.usableDiameter);
      if (computedWidth <= 0) return null;
      const requiredDiagonal = requiredDiagonalWithWane(computedWidth, thickness, allowedWane);
      const lengthFields = candidateLengthFields(d, geom, v, requiredDiagonal, allowedWane);
      if (!lengthFields.usableLengthOk) return null;
      return {
        ...d,
        width: computedWidth,
        height: thickness,
        computedWidth,
        allowedWane,
        diagonal: Math.hypot(computedWidth, thickness),
        requiredDiagonal,
        resolvedLabel: `${thickness} × ${computedWidth}${d.wildEdge ? " R" : ""}`,
        ...lengthFields,
      };
    }

    if (d.type === "minWidth") {
      const thickness = d.height;
      const minWidth = d.minWidth || d.width || 0;
      const computedWidth = maxFreeWidthForThickness(thickness, geom, allowedWane, lengthDiameter.usableDiameter);
      if (computedWidth < minWidth) return null;
      const requiredDiagonal = requiredDiagonalWithWane(computedWidth, thickness, allowedWane);
      const lengthFields = candidateLengthFields(d, geom, v, requiredDiagonal, allowedWane);
      if (!lengthFields.usableLengthOk) return null;
      return {
        ...d,
        width: computedWidth,
        height: thickness,
        minWidth,
        computedWidth,
        allowedWane,
        diagonal: Math.hypot(computedWidth, thickness),
        requiredDiagonal,
        resolvedLabel: `${thickness} × ${computedWidth}${d.wildEdge ? " R" : ""}`,
        ...lengthFields,
      };
    }

    const requiredDiagonal = requiredDiagonalWithWane(d.width, d.height, allowedWane);
    const lengthFields = candidateLengthFields(d, geom, v, requiredDiagonal, allowedWane);
    if (!lengthFields.usableLengthOk) return null;
    if (requiredDiagonal > lengthDiameter.usableDiameter + 2 * allowedWane + 0.5) return null;
    return {
      ...d,
      allowedWane,
      diagonal: Math.hypot(d.width, d.height),
      requiredDiagonal,
      resolvedLabel: `${d.width} × ${d.height}${d.wildEdge ? " R" : ""}`,
      ...lengthFields,
    };
  }

  function findBestCenterBlockFromInputs(dimensions, geom, v, mode) {
    let active = (Array.isArray(dimensions) ? dimensions : []).filter(d => d.active);
    const selectedMode = mode || "mixed";

    if (selectedMode === "timber") active = active.filter(d => d.type === "fixed");
    if (selectedMode === "plank") active = active.filter(d => d.type === "freeWidth");
    if (selectedMode === "panel") active = active.filter(d => d.type === "minWidth" || d.wildEdge);

    for (const d of active) {
      const candidate = resolveDimensionCandidate(d, geom, v);
      if (candidate) return { ...candidate, resultType: candidate.type || "fixed" };
    }
    return null;
  }

  function getStateDimensions() {
    if (global.SawState && typeof global.SawState.getDimensions === "function") {
      const stateDimensions = global.SawState.getDimensions();
      if (Array.isArray(stateDimensions) && stateDimensions.length) return stateDimensions;
    }
    return [];
  }

  function findBestCenterBlockFromDom(geom, v) {
    const modeEl = document.getElementById("optimizationMode");
    const mode = modeEl ? modeEl.value : "mixed";
    return findBestCenterBlockFromInputs(getStateDimensions(), geom, v, mode);
  }

  global.SawDimensionResolver = {
    resolveDimensionCandidate,
    findBestCenterBlockFromInputs,
    findBestCenterBlockFromDom,
    usableLengthForRequiredDiagonal,
    lengthRequirementPct,
  };
})(window);