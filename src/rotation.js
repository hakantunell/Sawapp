// src/rotation.js
// Hjälpfunktioner för rotationsordning och rotationskonvertering.
//
// Detta är förberedande modulering. Funktionerna kopplas inte in förrän adapter laddas separat.
// Den rena delen, rotationToRadians/sideForRotation, påverkar flera renderings- och
// sågplansdelar och ska därför aktiveras separat och försiktigt.

(function initSawRotation(global) {
  function sideForRotation(rot) {
    const norm = ((rot % 360) + 360) % 360;
    if (norm === 0) return "top";
    if (norm === 180) return "bottom";
    if (norm === 90) return "right";
    if (norm === 270) return "left";
    return "top";
  }

  function rotationToRadians(rotationValue) {
    // Rotationsordningen i såglistan beskriver hur stocken vrids på sågen:
    // 90° betyder att höger sida hamnar upp mot svärdet,
    // 270° betyder att vänster sida hamnar upp mot svärdet.
    // Canvas positiva rotation går åt andra hållet för vår koordinatmodell.
    return -(rotationValue || 0) * Math.PI / 180;
  }

  function getRotationSequenceFromValues(preset, manualRotation) {
    if (preset === "opposite-first") return [0, 180, 90, 270];

    if (preset === "manual") {
      const seq = String(manualRotation || "")
        .split(",")
        .map(s => Number(s.trim()))
        .filter(Number.isFinite);
      return seq.length ? seq : [0, 90, 180, 270];
    }

    return [0, 90, 180, 270];
  }

  function getRotationSequenceFromDom() {
    const presetEl = document.getElementById("rotationPreset");
    const manualEl = document.getElementById("manualRotation");
    return getRotationSequenceFromValues(
      presetEl ? presetEl.value : "default",
      manualEl ? manualEl.value : ""
    );
  }

  global.SawRotation = {
    sideForRotation,
    rotationToRadians,
    getRotationSequenceFromValues,
    getRotationSequenceFromDom,
  };
})(window);
