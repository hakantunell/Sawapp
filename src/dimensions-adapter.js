// src/dimensions-adapter.js
// Adapter som kopplar legacy app.js till den nya dimensionsmodulen.
//
// Den här filen laddas efter legacy app.js och ersätter rena dimensionsfunktioner
// med implementationerna i SawDimensions. Syftet är att kunna flytta logik stegvis
// utan att ändra övrig UI-, sågplan- eller renderingskod i samma steg.
//
// OBS:
// findBestCenterBlock() behålls tills vidare i legacy app.js, eftersom den använder
// den lexikala variabeln `dimensions` som inte ligger på window. Om vi ersätter den
// här får sågordningen ingen aktiv centrumdimension och visar felmeddelandet
// "Ingen aktiv dimension får plats ..." trots att layouten finns.

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

  // Bevara den ursprungliga legacy-funktionen om en tidigare adapter redan har sparat den.
  // centerblock-adaptern laddas före denna fil och kan annars råka skriva över
  // findBestCenterBlockLegacy med den nya adapterfunktionen.
  if (typeof global.findBestCenterBlock === "function" && !global.findBestCenterBlockLegacy) {
    global.findBestCenterBlockLegacy = global.findBestCenterBlock;
  }

  global.dimensionLabel = d.dimensionLabel;
  global.effectiveAllowedWaneForDimension = d.effectiveAllowedWaneForDimension;
  global.effectiveCornerWane = d.effectiveCornerWane;
  global.requiredDiagonalWithWane = d.requiredDiagonalWithWane;
  global.maxFreeWidthForThickness = d.maxFreeWidthForThickness;
  global.resolveDimensionCandidate = d.resolveDimensionCandidate;

  // Behåll legacy findBestCenterBlock tills dimensions-state har flyttats till en modul.
  if (global.findBestCenterBlockLegacy) {
    global.findBestCenterBlock = global.findBestCenterBlockLegacy;
  }

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
