// src/dimensions-editor-activation-adapter.js
// Aktiverar den nya state-baserade dimensionseditorn.
//
// Viktigt:
// - Den här adaptern laddas efter dimensions-state-sync och ersätter därför
//   den tidigare legacy renderDimensions()-wrappen.
// - Beräkningar som tidigare var beroende av legacy dimensions-arrayen är nu
//   redan adapterade till SawState via dimension-resolver och packing-dimensions.
// - Legacy dimensions-arrayen finns fortfarande kvar i app.js, men ska inte vara
//   primär källa när den här adaptern är aktiv.

(function activateSawDimensionsEditor(global) {
  if (global.__dimensionsEditorActivationInstalled) return;

  if (typeof global.renderDimensionsEditorFromState !== "function") {
    console.warn("renderDimensionsEditorFromState saknas. Dimensionseditorn aktiveras inte.");
    return;
  }

  if (!global.SawState || typeof global.SawState.getDimensions !== "function") {
    console.warn("SawState saknas. Dimensionseditorn aktiveras inte.");
    return;
  }

  if (typeof global.renderDimensions === "function") {
    global.renderDimensionsLegacy = global.renderDimensions;
  }

  global.__dimensionsEditorActivationInstalled = true;

  global.renderDimensions = function renderDimensionsFromState() {
    return global.renderDimensionsEditorFromState();
  };

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
