// src/dimensions-editor-adapter.js
// Adapter mellan SawState och den nya dimensionseditorn.
//
// Den här adaptern ersätter inte legacy renderDimensions() automatiskt.
// Den exponerar bara renderDimensionsEditorFromState(), så att vi kan aktivera
// den kontrollerat när SawState är primär källa för dimensionslistan.

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

  function resetStep() {
    if (global.SawState && typeof global.SawState.resetCurrentStepIndex === "function") {
      global.SawState.resetCurrentStepIndex();
    }
    if (typeof global.currentStepIndex === "number") {
      global.currentStepIndex = 0;
    }
  }

  function rerenderAndUpdate() {
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
  };

  global.renderDimensionsEditorFromState = renderDimensionsEditorFromState;
})(window);
