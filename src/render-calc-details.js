// src/render-calc-details.js
// Renderer för kalkyldetaljer-tabellen.
//
// Den här filen patchar inte update(). Den exponerar bara renderCalcDetails()
// så att update()-flödet senare kan byta från inline-DOM till ett direkt
// funktionsanrop på ett kontrollerat sätt.

(function initSawRenderCalcDetails(global) {
  function formatMm(value, decimals = 0) {
    if (typeof global.fmtMm === "function") return global.fmtMm(value, decimals);
    return `${Number(value).toFixed(decimals)} mm`;
  }

  function renderCalcDetails(geom, block, values) {
    const tableBody = global.$ ? global.$("calcDetails") : document.getElementById("calcDetails");
    if (!tableBody || !geom) return;

    const v = values || {};
    const allowedCornerWane = typeof global.effectiveCornerWane === "function"
      ? global.effectiveCornerWane(v)
      : 0;

    tableBody.innerHTML = `
      <tr><td>Extrapolerad rotända</td><td>${formatMm(geom.rootEnd, 1)}</td></tr>
      <tr><td>Beräknad/angiven toppända</td><td>${formatMm(geom.topEnd, 1)}</td></tr>
      <tr><td>Minsta diameter i modell</td><td>${formatMm(geom.minEnd, 1)}</td></tr>
      <tr><td>Design-Ø efter krokighet</td><td>${formatMm(geom.designDiameter, 1)}</td></tr>
      <tr><td>Användbar Ø efter bark/marginal</td><td>${formatMm(geom.usableDiameter, 1)}</td></tr>
      <tr><td>Överhäng per ände</td><td>${formatMm(geom.overhangEachEnd, 0)}</td></tr>
      <tr><td>Tillåten vankant</td><td>${formatMm(allowedCornerWane, 1)}</td></tr>
      <tr><td>Krav diagonal valt block</td><td>${block ? formatMm(block.requiredDiagonal, 1) : "–"}</td></tr>
    `;
  }

  global.SawRenderCalcDetails = {
    renderCalcDetails,
  };

  global.renderCalcDetails = renderCalcDetails;
})(window);
