// src/inputs-adapter.js
// Adapter som kopplar legacy values() till SawInputs.values().
//
// Detta är ett säkert steg eftersom values() bara läser DOM-fält och returnerar
// samma datastruktur som tidigare.

(function installInputsAdapter(global) {
  if (!global.SawInputs) {
    console.warn("SawInputs saknas. values() lämnas oförändrad.");
    return;
  }

  if (typeof global.values === "function") {
    global.valuesLegacy = global.values;
  }

  global.values = global.SawInputs.values;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
