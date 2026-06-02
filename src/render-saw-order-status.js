// src/render-saw-order-status.js
// Renderer/controller för statuskortet i sågordningspanelen.
//
// Den skriver till samma DOM-yta som legacy update(): #sawOrder.

(function initSawRenderSawOrderStatus(global) {
  function formatMm(value, decimals = 1) {
    if (typeof global.fmtMm === "function") return global.fmtMm(value, decimals);
    return `${Number(value).toFixed(decimals)} mm`;
  }

  function formatInches(value) {
    if (typeof global.fmtIn === "function") return global.fmtIn(value);
    return `${(Number(value) / 25.4).toFixed(2)}\"`;
  }

  function blockLabel(block) {
    if (!block) return "–";
    return block.resolvedLabel || `${block.width}×${block.height}`;
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

  function planLabel(model) {
    if (!model) return "–";
    if (Array.isArray(model.sawmillCutPlan) && model.sawmillCutPlan.length) {
      return `${model.sawmillCutPlan.length} steg (sidobitar först)`;
    }
    const sideYieldCount = Array.isArray(model.sideYield) ? model.sideYield.length : 0;
    return `${sideYieldCount} brädor/paneler`;
  }

  function activePlanLength(model) {
    if (!model) return 0;
    if (Array.isArray(model.activePlan)) return model.activePlan.length;
    if (Array.isArray(model.sawmillCutPlan) && model.sawmillCutPlan.length) return model.sawmillCutPlan.length;
    if (Array.isArray(model.sawList)) return model.sawList.length;
    return 0;
  }

  function currentStepIndex(model) {
    if (model && Number.isFinite(model.stepIndex)) return model.stepIndex;
    if (global.SawState && typeof global.SawState.getCurrentStepIndex === "function") {
      return global.SawState.getCurrentStepIndex();
    }
    return 0;
  }

  function setCurrentStepIndex(index) {
    if (global.SawState && typeof global.SawState.setCurrentStepIndex === "function") {
      global.SawState.setCurrentStepIndex(index);
    }
  }

  function navigateBy(delta, model) {
    const length = activePlanLength(model);
    if (!length) return;

    const nextIndex = (currentStepIndex(model) + delta + length) % length;
    setCurrentStepIndex(nextIndex);

    if (typeof global.update === "function") global.update();
  }

  function wireStepControls(model) {
    const length = activePlanLength(model);
    if (!length) return;

    const prev = global.document.getElementById("prevStep");
    const next = global.document.getElementById("nextStep");
    if (prev) prev.onclick = () => navigateBy(-1, model);
    if (next) next.onclick = () => navigateBy(1, model);
  }

  function renderSawOrderStatus(model) {
    const el = global.$ ? global.$("sawOrder") : document.getElementById("sawOrder");
    if (!el) return false;

    const block = model && model.block;
    const step = model && model.step;

    if (!block || !step) {
      el.innerHTML = `<div class="status-bad">Ingen aktiv dimension får plats med nuvarande designdiameter/användbar diameter.</div>`;
      return true;
    }

    const allowedWane = Number.isFinite(block.allowedWane) ? block.allowedWane : 0;
    const requiredDiagonal = Number.isFinite(block.requiredDiagonal) ? block.requiredDiagonal : block.diagonal;
    const diagonal = Number.isFinite(block.diagonal) ? block.diagonal : requiredDiagonal;
    const support1 = Number.isFinite(step.rootSupportHeight) ? step.rootSupportHeight : (step.bladeToBed || 0);
    const support2 = Number.isFinite(step.topSupportHeight) ? step.topSupportHeight : (step.bladeToBed || 0);

    el.innerHTML = `
      <div class="status-ok">
        Vald dimension: <strong>${blockLabel(block)}</strong><br>
        Tillåten vankant: <strong>${formatMm(allowedWane, 1)}</strong><br>
        Krav diagonal: <strong>${formatMm(requiredDiagonal, 1)}</strong> istället för ${formatMm(diagonal, 1)}<br>
        Aktuellt snitt: <strong>${stepLabel(step)}</strong><br>
        Referens: <strong>${referenceLabel(step)}</strong><br>
        ${model && model.mode === "sawmill" ? "Sågplan" : "Sidoutbyte"}: <strong>${planLabel(model)}</strong><br>
        Stöd 1: <strong>${support1.toFixed(0)} mm / ${formatInches(support1)}</strong><br>
        Stöd 2: <strong>${support2.toFixed(0)} mm / ${formatInches(support2)}</strong>
      </div>
      <div class="stepControls">
        <button id="prevStep">← Föregående snitt</button>
        <button id="nextStep">Nästa snitt →</button>
      </div>
    `;

    wireStepControls(model);
    return true;
  }

  global.SawRenderSawOrderStatus = {
    renderSawOrderStatus,
  };

  global.renderSawOrderStatus = renderSawOrderStatus;
})(window);
