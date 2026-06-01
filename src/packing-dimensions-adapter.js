// src/packing-dimensions-adapter.js
// Adapter som kopplar legacy packningshjälpare till SawPackingDimensions.
//
// Detta påverkar packnings-/sågverkslogik men inte canvasrendering,
// currentStepIndex, stödberäkning, rotation eller svärdsposition direkt.

(function installPackingDimensionsAdapter(global) {
  if (!global.SawPackingDimensions) {
    console.warn("SawPackingDimensions saknas. Packningsfunktioner lämnas oförändrade.");
    return;
  }

  const packing = global.SawPackingDimensions;

  if (typeof global.activePackingDimensions === "function") {
    global.activePackingDimensionsLegacy = global.activePackingDimensions;
  }
  if (typeof global.circleWidthAtY === "function") {
    global.circleWidthAtYLegacy = global.circleWidthAtY;
  }
  if (typeof global.dimensionToPackCandidate === "function") {
    global.dimensionToPackCandidateLegacy = global.dimensionToPackCandidate;
  }
  if (typeof global.rectFitsCircle === "function") {
    global.rectFitsCircleLegacy = global.rectFitsCircle;
  }

  global.activePackingDimensions = packing.activePackingDimensionsFromGlobal;
  global.circleWidthAtY = packing.circleWidthAtY;
  global.dimensionToPackCandidate = packing.dimensionToPackCandidate;
  global.rectFitsCircle = packing.rectFitsCircle;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
