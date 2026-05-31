// src/dimensions-adapter.js
// Adapter som kopplar legacy app.js till den nya dimensionsmodulen.
//
// Den här filen laddas efter legacy app.js och ersätter rena dimensionsfunktioner
// med implementationerna i SawDimensions. Syftet är att kunna flytta logik stegvis
// utan att ändra övrig UI-, sågplan- eller renderingskod i samma steg.

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
  if (typeof global.findBestCenterBlock === "function") global.findBestCenterBlockLegacy = global.findBestCenterBlock;

  global.dimensionLabel = d.dimensionLabel;
  global.effectiveAllowedWaneForDimension = d.effectiveAllowedWaneForDimension;
  global.effectiveCornerWane = d.effectiveCornerWane;
  global.requiredDiagonalWithWane = d.requiredDiagonalWithWane;
  global.maxFreeWidthForThickness = d.maxFreeWidthForThickness;
  global.resolveDimensionCandidate = d.resolveDimensionCandidate;

  // Legacy findBestCenterBlock hämtade mode och dimensions globalt.
  // Behåll samma signatur utåt men delegera själva logiken till modulen.
  global.findBestCenterBlock = function findBestCenterBlock(geom, v) {
    const mode = global.$ && global.$("optimizationMode") ? global.$("optimizationMode").value : "mixed";
    const dimensions = global.dimensions || [];
    return d.findBestCenterBlock(dimensions, geom, v, mode);
  };

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
