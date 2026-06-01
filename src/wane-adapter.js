// src/wane-adapter.js
// Adapter som kopplar legacy vankants-/diagonalfunktioner till SawWane.
//
// Detta är ren beräkningslogik. Ingen canvas, DOM, currentStepIndex eller rendering påverkas direkt.

(function installWaneAdapter(global) {
  if (!global.SawWane) {
    console.warn("SawWane saknas. Vankantsfunktioner lämnas oförändrade.");
    return;
  }

  const wane = global.SawWane;

  if (typeof global.requiredDiagonalWithWane === "function") {
    global.requiredDiagonalWithWaneLegacy = global.requiredDiagonalWithWane;
  }
  if (typeof global.effectiveCornerWane === "function") {
    global.effectiveCornerWaneLegacy = global.effectiveCornerWane;
  }
  if (typeof global.effectiveAllowedWaneForDimension === "function") {
    global.effectiveAllowedWaneForDimensionLegacy = global.effectiveAllowedWaneForDimension;
  }
  if (typeof global.maxFreeWidthForThickness === "function") {
    global.maxFreeWidthForThicknessLegacy = global.maxFreeWidthForThickness;
  }

  global.requiredDiagonalWithWane = wane.requiredDiagonalWithWane;
  global.effectiveCornerWane = wane.effectiveCornerWane;
  global.effectiveAllowedWaneForDimension = wane.effectiveAllowedWaneForDimension;
  global.maxFreeWidthForThickness = wane.maxFreeWidthForThickness;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
