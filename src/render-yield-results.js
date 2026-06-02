// src/render-yield-results.js
// Renderers för sidoutbyte och sågverkslayoutens resultatkort.

(function initSawRenderYieldResults(global) {
  function targetElement() {
    return global.$ ? global.$("sideYield") : document.getElementById("sideYield");
  }

  function renderPackingResult(packing) {
    const el = targetElement();
    if (!el) return;
    if (!packing || !packing.length) {
      el.innerHTML = `<div class="status-bad">Ingen sågverkslayout hittades för aktiva dimensioner.</div>`;
      return;
    }

    const area = packing.reduce((sum, r) => sum + r.w * r.h / 1e6, 0);
    el.innerHTML = `
      <div class="status-ok">
        Sågverkslayout: <strong>${packing.length}</strong> bitar, area <strong>${area.toFixed(3)} m²</strong>.
        <br><span class="hint">Förenklad prioritetspackning. Sågplanen frigör sidobitar först och blockar kärnan sist.</span>
      </div>
      <div class="sideYieldGrid">
        ${packing.map((r, i) => `
          <div class="sideYieldCard">
            <strong>${i + 1}. ${r.label}</strong>
            <span>${Math.round(r.w)} × ${Math.round(r.h)} mm</span>
            <small>${r.wildEdge ? "vildmark/råkant tillåten" : "ren dimension"} · prioritet ${r.priorityIndex + 1}</small>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderSideYield(sideYield) {
    const el = targetElement();
    if (!el) return;
    if (!sideYield || !sideYield.length) {
      el.innerHTML = `<div class="status-bad">Inget sidoutbyte beräknat. Aktivera Fri bredd/Minbredd/Vildmark i dimensionslistan.</div>`;
      return;
    }

    el.innerHTML = `
      <div class="sideYieldGrid">
        ${sideYield.map(s => `
          <div class="sideYieldCard">
            <strong>${s.side}</strong>
            <span>${s.label}</span>
            <small>${s.edgeNote}. Sidodjup ca ${s.availableDepth} mm.</small>
          </div>
        `).join("")}
      </div>
    `;
  }

  global.SawRenderYieldResults = {
    renderPackingResult,
    renderSideYield,
  };

  if (typeof global.renderPackingResult === "function") {
    global.renderPackingResultLegacy = global.renderPackingResult;
    global.renderPackingResult = renderPackingResult;
  }

  if (typeof global.renderSideYield === "function") {
    global.renderSideYieldLegacy = global.renderSideYield;
    global.renderSideYield = renderSideYield;
  }

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
