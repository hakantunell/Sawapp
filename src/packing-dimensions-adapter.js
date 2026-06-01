// src/packing-dimensions-adapter.js
// Adapter som kopplar legacy packningshjalpare till SawPackingDimensions.
//
// activePackingDimensions bevaras i legacy tills dimensions-state flyttas,
// eftersom dimensions i app.js ar en lexical variabel och inte window.dimensions.

(function installPackingDimensionsAdapter(global) {
  if (!global.SawPackingDimensions) {
    console.warn("SawPackingDimensions saknas. Packningsfunktioner lamnas oforandrade.");
    return;
  }

  const packing = global.SawPackingDimensions;

  // Fanga alltid legacy-versionen innan vi binder om nagra funktioner.
  const legacyActivePackingDimensions =
    typeof global.activePackingDimensions === "function"
      ? global.activePackingDimensions
      : global.activePackingDimensionsLegacy;

  if (legacyActivePackingDimensions) {
    global.activePackingDimensionsLegacy = legacyActivePackingDimensions;
    global.activePackingDimensions = legacyActivePackingDimensions;
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

  // Dessa ar rena hjalpmetoder och kan bindas till modulen direkt.
  global.circleWidthAtY = packing.circleWidthAtY;
  global.dimensionToPackCandidate = packing.dimensionToPackCandidate;
  global.rectFitsCircle = packing.rectFitsCircle;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
