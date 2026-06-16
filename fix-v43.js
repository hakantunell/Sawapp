// fix-v43.js
// Extra guard for spoken stock length values.
// Voice input normally treats stock measurements as centimeters, e.g. "längd fyra sextio" -> 4600 mm.
// If a length is spoken or entered as a clear millimeter value, e.g. "längd 4500", keep it as 4500 mm.
(function installLogLengthMillimeterGuard(global) {
  let normalizing = false;

  function $(id) {
    return global.document.getElementById(id);
  }

  function normalizeLogLength() {
    if (normalizing) return false;
    const input = $("logLength");
    if (!input || input.value === "") return false;

    const value = Number(input.value);
    if (!Number.isFinite(value)) return false;

    // Realistic stock length range is already treated as 1500–8000 mm elsewhere.
    // Values above that are most likely from voice input interpreting "4500" as 4500 cm.
    if (value > 8000 && value <= 80000) {
      normalizing = true;
      input.value = String(Math.round(value / 10));
      normalizing = false;

      if (global.SawState && typeof global.SawState.resetCurrentStepIndex === "function") {
        global.SawState.resetCurrentStepIndex();
      }
      if (typeof global.update === "function") global.update();
      return true;
    }

    return false;
  }

  function install() {
    const input = $("logLength");
    if (!input || input.dataset.lengthMmGuardInstalled === "true") return;
    input.dataset.lengthMmGuardInstalled = "true";
    input.addEventListener("input", normalizeLogLength);
    input.addEventListener("change", normalizeLogLength);
    normalizeLogLength();
  }

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
