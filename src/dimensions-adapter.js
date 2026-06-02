// src/dimensions-adapter.js
// Adapter som kopplar legacy app.js till den nya dimensionsmodulen.

(function installDimensionsAdapter(global) {
  if (!global.SawDimensions) {
    console.warn("SawDimensions saknas. Dimensionsfunktioner lämnas oförändrade.");
    return;
  }

  const d = global.SawDimensions;

  if (typeof global.dimensionLabel === "function") global.dimensionLabelLegacy = global.dimensionLabel;
  if (typeof global.effectiveAllowedWaneForDimension === "function") global.effectiveAllowedWaneForDimensionLegacy = global.effectiveAllowedWaneForDimension;
  if (typeof global.effectiveCornerWane === "function") global.effectiveCornerWaneLegacy = global.effectiveCornerWane;
  if (typeof global.requiredDiagonalWithWane === "function") global.requiredDiagonalWithWaneLegacy = global.requiredDiagonalWithWane;
  if (typeof global.maxFreeWidthForThickness === "function") global.maxFreeWidthForThicknessLegacy = global.maxFreeWidthForThickness;
  if (typeof global.resolveDimensionCandidate === "function") global.resolveDimensionCandidateLegacy = global.resolveDimensionCandidate;

  global.dimensionLabel = d.dimensionLabel;
  global.effectiveAllowedWaneForDimension = d.effectiveAllowedWaneForDimension;
  global.effectiveCornerWane = d.effectiveCornerWane;
  global.requiredDiagonalWithWane = d.requiredDiagonalWithWane;
  global.maxFreeWidthForThickness = d.maxFreeWidthForThickness;
  global.resolveDimensionCandidate = d.resolveDimensionCandidate;

  // findBestCenterBlock hanteras nu av centerblock-adaptern via SawState.

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
