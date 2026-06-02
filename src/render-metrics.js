// src/render-metrics.js
// Renderer för nyckeltalen i resultatpanelen.
//
// Passiv modul: patchar inte update(). Anropas senare direkt från update()-flödet.

(function initSawRenderMetrics(global) {
  function formatMm(value, decimals = 0) {
    if (typeof global.fmtMm === "function") return global.fmtMm(value, decimals);
    return `${Number(value).toFixed(decimals)} mm`;
  }

  function renderMetrics(geom, metrics) {
    if (!geom || !metrics) return;

    const designDiameter = global.$ ? global.$("designDiameter") : document.getElementById("designDiameter");
    const usableDiameter = global.$ ? global.$("usableDiameter") : document.getElementById("usableDiameter");
    const yieldPct = global.$ ? global.$("yieldPct") : document.getElementById("yieldPct");
    const sawnArea = global.$ ? global.$("sawnArea") : document.getElementById("sawnArea");
    const logVolume = global.$ ? global.$("logVolume") : document.getElementById("logVolume");

    if (designDiameter) designDiameter.textContent = formatMm(geom.designDiameter, 0);
    if (usableDiameter) usableDiameter.textContent = formatMm(geom.usableDiameter, 0);
    if (yieldPct) yieldPct.textContent = `${Number(metrics.yieldPct || 0).toFixed(1)} %`;
    if (sawnArea) sawnArea.textContent = `${Number(metrics.sawnArea || 0).toFixed(3)} m²`;
    if (logVolume) logVolume.textContent = `${Number(geom.logVolume || 0).toFixed(3)} m³`;
  }

  function calculateMetrics(block, geom, sideYield, packingLayout) {
    if (!geom) {
      return { sideArea: 0, sawnArea: 0, logArea: 0, yieldPct: 0 };
    }

    const sideArea = packingLayout
      ? packingLayout.reduce((sum, r) => sum + (r.w * r.h / 1e6), 0)
      : (sideYield ? sideYield.reduce((sum, s) => sum + (s.width * s.thickness / 1e6), 0) : 0);

    const sawnArea = block ? (block.width * block.height / 1e6 + sideArea) : 0;
    const logArea = Math.PI * Math.pow((geom.designDiameter || 0) / 2, 2) / 1e6;
    const yieldPct = block && logArea ? (sawnArea / logArea) * 100 : 0;

    return { sideArea, sawnArea, logArea, yieldPct };
  }

  global.SawRenderMetrics = {
    calculateMetrics,
    renderMetrics,
  };

  global.calculateMetrics = calculateMetrics;
  global.renderMetrics = renderMetrics;
})(window);
