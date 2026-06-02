// src/render-input-visibility.js
// Renderer för små input-beroende visibility-regler.
//
// Första ansvaret är att visa/dölja fältet för manuell rotation.

(function initSawRenderInputVisibility(global) {
  function byId(id) {
    return global.document.getElementById(id);
  }

  function renderInputVisibility() {
    const rotationPreset = byId("rotationPreset");
    const manualRotationWrap = byId("manualRotationWrap");
    if (rotationPreset && manualRotationWrap) {
      manualRotationWrap.classList.toggle("hidden", rotationPreset.value !== "manual");
    }
    return true;
  }

  global.SawRenderInputVisibility = {
    renderInputVisibility,
  };

  global.renderInputVisibility = renderInputVisibility;
})(window);
