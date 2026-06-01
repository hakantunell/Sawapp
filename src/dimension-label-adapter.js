// src/dimension-label-adapter.js
// Adapter som kopplar legacy dimensionLabel() till SawDimensionLabel.dimensionLabel().
//
// Ren textlogik. Ingen påverkan på beräkning, rendering, kerf, rotation eller state.

(function installDimensionLabelAdapter(global) {
  if (!global.SawDimensionLabel || typeof global.SawDimensionLabel.dimensionLabel !== "function") {
    console.warn("SawDimensionLabel saknas. dimensionLabel lämnas oförändrad.");
    return;
  }

  if (typeof global.dimensionLabel === "function") {
    global.dimensionLabelLegacy = global.dimensionLabel;
  }

  global.dimensionLabel = global.SawDimensionLabel.dimensionLabel;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
