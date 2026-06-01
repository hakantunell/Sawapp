// src/format.js
// Grundläggande formatteringshjälpare.
//
// Modulen är avsiktligt liten och ren. Den påverkar inte såglogik, rendering,
// kerf, rotation eller state. Adapter kopplas in separat i nästa steg.

(function initSawFormat(global) {
  function mmToIn(mm) {
    return Number(mm || 0) / 25.4;
  }

  function fmtMm(v, d = 0) {
    return `${Number(v || 0).toFixed(d)} mm`;
  }

  function fmtIn(v) {
    return `${mmToIn(v).toFixed(2)}"`;
  }

  global.SawFormat = {
    mmToIn,
    fmtMm,
    fmtIn,
  };
})(window);
