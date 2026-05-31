// src/current-step-sync.js
// Första lågrisk-steget i migreringen av currentStepIndex till SawState.
//
// Legacy app.js använder fortfarande sin lokala currentStepIndex. Den här filen
// speglar de enkla reset-händelserna till SawState, så att state-modulen hålls i
// synk inför nästa steg utan att vi rör rendering eller sågplanslogik.

(function installCurrentStepSync(global) {
  if (!global.SawState) {
    console.warn("SawState saknas. current-step-sync aktiveras inte.");
    return;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function resetStateStep() {
    global.SawState.resetCurrentStepIndex();
  }

  const resetIds = [
    "rootDiameter",
    "topDiameter",
    "rootEndDiameter",
    "topEndDiameter",
    "logLength",
    "sweep",
    "supportDistance",
    "bark",
    "kerf",
    "margin",
    "cornerWane",
    "profileRadius",
    "rotationPreset",
    "manualRotation",
    "optimizationMode",
  ];

  resetIds.forEach((id) => {
    const el = byId(id);
    if (!el) return;
    el.addEventListener("input", resetStateStep);
    el.addEventListener("change", resetStateStep);
  });

  const preset = byId("presetTimber");
  if (preset) {
    preset.addEventListener("click", resetStateStep);
  }

  // Initialt spegla legacy-startläget.
  resetStateStep();
})(window);
