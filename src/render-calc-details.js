// src/render-calc-details.js
// Renderer för kalkyldetaljer-tabellen.

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

  if (typeof global.update === "function" && !global.__renderCalcDetailsUpdatePatchInstalled) {
    global.__renderCalcDetailsUpdatePatchInstalled = true;
    const legacyUpdate = global.update;
    global.update = function updateWithCalcDetailsRenderer() {
      legacyUpdate.apply(this, arguments);

      if (typeof global.values !== "function" || typeof global.computeGeometry !== "function") return;
      const v = global.values();
      const geom = global.computeGeometry(v);
      const block = typeof global.findBestCenterBlock === "function"
        ? global.findBestCenterBlock(geom, v)
        : null;

      renderCalcDetails(geom, block, v);
    };

    global.update();
  }
})(window);
