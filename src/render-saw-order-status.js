// src/render-saw-order-status.js
// Renderer för statuskortet i sågordningspanelen.
//
// Passiv modul. Den anropas explicit från adapter/update och ändrar inga
// beräkningar.

(function initSawRenderSawOrderStatus(global) {
  function formatMm(value, decimals = 1) {
    if (typeof global.fmtMm === "function") return global.fmtMm(value, decimals);
    return `${Number(value).toFixed(decimals)} mm`;
  }

  function blockLabel(block) {
    if (!block) return "–";
    return block.resolvedLabel || `${block.width} × ${block.height}`;
  }

  function stepLabel(step) {
    if (!step) return "–";
    return `Steg ${step.step}, rotation ${step.rotation || `${step.rotationValue || 0}°`}`;
  }

  function referenceLabel(step) {
    if (!step) return "–";
    return step.reference || (
      step.kind === "slab" ? "Yttersnitt / slabba" :
      step.kind === "side" ? "Sidobit / planka" :
      step.kind === "center" ? "Kärna / centrumblock" :
      step.note || "–"
    );
  }

  function planLabel(plan) {
    const count = Array.isArray(plan) ? plan.length : 0;
    return count ? `${count} steg (sidobitar först)` : "–";
  }

  function renderSawOrderStatus(model) {
    const el = global.$ ? global.$("sawOrderStatus") : document.getElementById("sawOrderStatus");
    if (!el) return;

    const block = model && model.block;
    const step = model && model.step;
    const plan = model && model.sawmillCutPlan;

    if (!block) {
      el.innerHTML = `<div class="status-bad">Ingen aktiv dimension ryms i stocken.</div>`;
      return;
    }

    const allowedWane = Number.isFinite(block.allowedWane) ? block.allowedWane : 0;
    const requiredDiagonal = Number.isFinite(block.requiredDiagonal) ? block.requiredDiagonal : block.diagonal;
    const diagonal = Number.isFinite(block.diagonal) ? block.diagonal : requiredDiagonal;

    const support1 = step && Number.isFinite(step.rootSupportHeight) ? step.rootSupportHeight : null;
    const support2 = step && Number.isFinite(step.topSupportHeight) ? step.topSupportHeight : null;

    el.innerHTML = `
      <div class="status-ok">
        Vald dimension: <strong>${blockLabel(block)}</strong><br>
        Tillåten vankant: <strong>${formatMm(allowedWane, 1)}</strong><br>
        Krav diagonal: <strong>${formatMm(requiredDiagonal, 1)}</strong> istället för ${formatMm(diagonal, 1)}<br>
        Aktuellt snitt: <strong>${stepLabel(step)}</strong><br>
        Referens: <strong>${referenceLabel(step)}</strong><br>
        Sågplan: <strong>${planLabel(plan)}</strong><br>
        ${support1 === null ? "" : `Stöd 1: <strong>${support1.toFixed(0)} mm / ${typeof global.fmtIn === "function" ? global.fmtIn(support1) : (support1 / 25.4).toFixed(2) + "\""}</strong><br>`}
        ${support2 === null ? "" : `Stöd 2: <strong>${support2.toFixed(0)} mm / ${typeof global.fmtIn === "function" ? global.fmtIn(support2) : (support2 / 25.4).toFixed(2) + "\""}</strong>`}
      </div>
    `;
  }

  global.SawRenderSawOrderStatus = {
    renderSawOrderStatus,
  };

  global.renderSawOrderStatus = renderSawOrderStatus;
})(window);
