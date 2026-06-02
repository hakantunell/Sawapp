// src/packing-dimensions-adapter.js
// Adapter som kopplar legacy packningshjalpare till SawPackingDimensions.

(function installPackingDimensionsAdapter(global) {
  if (!global.SawPackingDimensions) {
    console.warn("SawPackingDimensions saknas. Packningsfunktioner lamnas oforandrade.");
    return;
  }

  const packing = global.SawPackingDimensions;

  if (typeof global.activePackingDimensions === "function") {
    global.activePackingDimensionsLegacy = global.activePackingDimensions;
  }
  if (typeof global.activeSideYieldDimensions === "function") {
    global.activeSideYieldDimensionsLegacy = global.activeSideYieldDimensions;
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
  global.activeSideYieldDimensions = packing.activeSideYieldDimensionsFromGlobal;
  global.circleWidthAtY = packing.circleWidthAtY;
  global.dimensionToPackCandidate = packing.dimensionToPackCandidate;
  global.rectFitsCircle = packing.rectFitsCircle;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
