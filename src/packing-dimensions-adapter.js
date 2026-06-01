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

  if (typeof global.activePackingDimensions === "function" && !global.activePackingDimensionsLegacy) {
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

  if (global.activePackingDimensionsLegacy) {
    global.activePackingDimensions = global.activePackingDimensionsLegacy;
  }

  global.circleWidthAtY = packing.circleWidthAtY;
  global.dimensionToPackCandidate = packing.dimensionToPackCandidate;
  global.rectFitsCircle = packing.rectFitsCircle;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
