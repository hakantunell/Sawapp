// src/format-adapter.js
// Adapter som kopplar legacy formatteringsfunktioner till SawFormat.
//
// Detta är lågrisk: funktionerna är rena och påverkar bara textformatteringen.

(function installFormatAdapter(global) {
  if (!global.SawFormat) {
    console.warn("SawFormat saknas. Formatteringsfunktioner lämnas oförändrade.");
    return;
  }

  if (typeof global.mmToIn === "function") global.mmToInLegacy = global.mmToIn;
  if (typeof global.fmtMm === "function") global.fmtMmLegacy = global.fmtMm;
  if (typeof global.fmtIn === "function") global.fmtInLegacy = global.fmtIn;

  global.mmToIn = global.SawFormat.mmToIn;
  global.fmtMm = global.SawFormat.fmtMm;
  global.fmtIn = global.SawFormat.fmtIn;
  global.formatBladeHeight = global.SawFormat.formatBladeHeight;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
