// src/inputs.js
// Inläsning av formulärvärden från DOM.
//
// Detta bryter ut values()-logiken från legacy app.js utan att ännu röra UI-bindningar
// eller sågplanslogik. Funktionen är defensiv: saknas ett fält returneras 0/standard.

(function initSawInputs(global) {
  function byId(id) {
    return document.getElementById(id);
  }

  function numberValue(id, fallback = 0) {
    const el = byId(id);
    if (!el) return fallback;
    const n = Number(el.value);
    return Number.isFinite(n) ? n : fallback;
  }

  function values() {
    return {
      rootDiameter: numberValue("rootDiameter", 0),
      topDiameter: numberValue("topDiameter", 0),
      rootEndDiameter: numberValue("rootEndDiameter", 0),
      topEndDiameter: numberValue("topEndDiameter", 0),
      logLength: numberValue("logLength", 0),
      sweep: numberValue("sweep", 0),
      supportDistance: numberValue("supportDistance", 1) || 1,
      bark: numberValue("bark", 0),
      kerf: numberValue("kerf", 0),
      margin: numberValue("margin", 0),
      cornerWane: numberValue("cornerWane", 0),
      profileRadius: numberValue("profileRadius", 0),
    };
  }

  global.SawInputs = {
    byId,
    numberValue,
    values,
  };
})(window);
