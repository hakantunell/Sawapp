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

  function selectedValue(id, fallback) {
    const el = global.document ? global.document.getElementById(id) : null;
    return el && el.value ? el.value : fallback;
  }

  function gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
      const t = y;
      y = x % y;
      x = t;
    }
    return x || 1;
  }

  function formatFractionalInches(mm, denominator) {
    const safeDenominator = Number(denominator) || 16;
    const rawInches = mmToIn(mm);
    const sign = rawInches < 0 ? "-" : "";
    const totalFractions = Math.round(Math.abs(rawInches) * safeDenominator);
    const whole = Math.floor(totalFractions / safeDenominator);
    let numerator = totalFractions % safeDenominator;

    if (numerator === 0) return `${sign}${whole}″`;

    const divisor = gcd(numerator, safeDenominator);
    numerator = numerator / divisor;
    const reducedDenominator = safeDenominator / divisor;

    if (whole === 0) return `${sign}${numerator}/${reducedDenominator}″`;
    return `${sign}${whole} ${numerator}/${reducedDenominator}″`;
  }

  function bladeHeightDisplay() {
    return selectedValue("bladeHeightDisplay", "mm");
  }

  function bladeHeightInchResolution() {
    const match = /^inch-(8|16|32)$/.exec(bladeHeightDisplay());
    return match ? Number(match[1]) : 16;
  }

  function formatBladeHeight(mm) {
    const number = Number(mm);
    if (!Number.isFinite(number)) return "–";
    if (bladeHeightDisplay().startsWith("inch-")) {
      return formatFractionalInches(number, bladeHeightInchResolution());
    }
    return fmtMm(number, 0);
  }

  global.SawFormat = {
    mmToIn,
    fmtMm,
    fmtIn,
    formatFractionalInches,
    bladeHeightDisplay,
    bladeHeightInchResolution,
    formatBladeHeight,
  };
})(window);
