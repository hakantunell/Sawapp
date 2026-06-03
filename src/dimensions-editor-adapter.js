// src/dimensions-editor-adapter.js
// Adapter mellan SawState och den nya dimensionseditorn.
//
// Under migrationen finns två dimensionskällor:
// - SawState.dimensions, som den nya editorn skriver till
// - legacy `dimensions` i app.js, som vissa äldre kodvägar fortfarande läser från
//
// Därför måste ändringar i editorn speglas tillbaka till legacy-listan tills
// legacy dimensions är helt borttagen.

(function initSawDimensionsEditorAdapter(global) {
  function canUseStateEditor() {
    return !!(
      global.SawState &&
      typeof global.SawState.getDimensions === "function" &&
      typeof global.SawState.patchDimension === "function" &&
      typeof global.SawState.moveDimension === "function" &&
      typeof global.renderDimensionsEditor === "function"
    );
  }

  function cloneDimensions(list) {
    return (Array.isArray(list) ? list : []).map((d) => ({ ...d }));
  }

  function syncStateDimensionsToLegacy() {
    if (!global.SawState || typeof global.SawState.getDimensions !== "function") return false;
    const next = cloneDimensions(global.SawState.getDimensions());

    try {
      if (typeof dimensions !== "undefined" && Array.isArray(dimensions)) {
        dimensions.length = 0;
        next.forEach((d) => dimensions.push({ ...d }));
        return true;
      }
    } catch (e) {
      // Ignorera om legacy-bindningen inte är åtkomlig.
    }

    return false;
  }

  function resetStep() {
    if (global.SawState && typeof global.SawState.resetCurrentStepIndex === "function") {
      global.SawState.resetCurrentStepIndex();
    }
    try {
      if (typeof currentStepIndex !== "undefined") {
        currentStepIndex = 0;
      }
    } catch (e) {
      // Ignorera om legacy-bindningen inte är åtkomlig.
    }
    if (typeof global.currentStepIndex === "number") {
      global.currentStepIndex = 0;
    }
  }

  function rerenderAndUpdate() {
    syncStateDimensionsToLegacy();
    renderDimensionsEditorFromState();
    if (typeof global.update === "function") global.update();
  }

  function renderDimensionsEditorFromState() {
    if (!canUseStateEditor()) return false;

    return global.renderDimensionsEditor({
      dimensions: global.SawState.getDimensions(),
      onChange(index, patch) {
        global.SawState.patchDimension(index, patch);
        resetStep();
        rerenderAndUpdate();
      },
      onMove(from, to) {
        global.SawState.moveDimension(from, to);
        resetStep();
        rerenderAndUpdate();
      },
    });
  }

  global.SawDimensionsEditorAdapter = {
    renderDimensionsEditorFromState,
    syncStateDimensionsToLegacy,
  };

  global.renderDimensionsEditorFromState = renderDimensionsEditorFromState;
  global.syncStateDimensionsToLegacy = syncStateDimensionsToLegacy;
})(window);
