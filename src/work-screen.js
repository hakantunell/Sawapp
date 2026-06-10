// src/work-screen.js
// Arbetsskärm: speglar aktuell sågbild och visar sågvy/stödmått för pågående snitt.

(function initSawWorkScreen(global) {
  function $(id) {
    return global.document.getElementById(id);
  }

  function formatMm(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(0)} mm` : "–";
  }

  function currentContext() {
    if (global.SawUpdatePipeline && typeof global.SawUpdatePipeline.buildPlanContext === "function") {
      return global.SawUpdatePipeline.buildPlanContext();
    }
    return null;
  }

  function copySawCanvas() {
    const source = $("sawCanvas");
    const target = $("bigSawCanvas");
    if (!source || !target) return false;

    const ctx = target.getContext("2d");
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(source, 0, 0, target.width, target.height);
    return true;
  }

  function renderSupportView(context) {
    const bigView = $("bigSupportSideView");
    if (!bigView || !context || !context.step) return false;

    const step = context.step;
    const geom = context.geom;
    const h1 = Number.isFinite(step.rootSupportHeight) ? step.rootSupportHeight : step.bladeToBed || 0;
    const h2 = Number.isFinite(step.topSupportHeight) ? step.topSupportHeight : step.bladeToBed || 0;

    const s1 = $("bigSupport1Label");
    const s2 = $("bigSupport2Label");
    if (s1) s1.textContent = `Stöd 1: ${formatMm(h1)}`;
    if (s2) s2.textContent = `Stöd 2: ${formatMm(h2)}`;

    const log = bigView.querySelector(".logSide");
    if (log && geom) {
      const d1 = geom.support1Diameter || 0;
      const d2 = geom.support2Diameter || 0;
      log.style.setProperty("--d1", `${Math.max(18, Math.min(70, d1 / 5))}px`);
      log.style.setProperty("--d2", `${Math.max(18, Math.min(70, d2 / 5))}px`);
    }

    return true;
  }

  function renderReadouts(context) {
    if (!context) return false;

    const step = context.step;
    const values = context.values || context.v || {};
    const index = (context.stepIndex || 0) + 1;
    const total = context.activePlanLength || 0;
    const length = Number(values.logLength || 0);

    const bigStep = $("bigStep");
    const bigRotation = $("bigRotation");
    const bigHeight = $("bigHeight");
    const bigReference = $("bigReference");
    const bigLogLength = $("bigLogLength");

    if (bigLogLength) bigLogLength.textContent = `Längd: ${length ? formatMm(length) : "–"}`;

    if (!step) {
      if (bigStep) bigStep.textContent = "Ingen sågplan";
      if (bigRotation) bigRotation.textContent = "Ange stöd 1, stöd 2 och längd.";
      if (bigHeight) bigHeight.textContent = "Stöd 1: – · Stöd 2: –";
      if (bigReference) bigReference.textContent = "";
      return true;
    }

    const h1 = Number.isFinite(step.rootSupportHeight) ? step.rootSupportHeight : step.bladeToBed || 0;
    const h2 = Number.isFinite(step.topSupportHeight) ? step.topSupportHeight : step.bladeToBed || 0;
    const cut = step.cut || (
      step.kind === "slab" ? "Ta bort ytterdel" :
      step.kind === "side" ? `Frigör ${step.label}` :
      step.label ? `Blocka ${step.label}` : ""
    );

    if (bigStep) bigStep.textContent = `Snitt ${index} av ${total}`;
    if (bigRotation) bigRotation.textContent = `Rotation ${step.rotation || "–"} – ${cut}`;
    if (bigHeight) bigHeight.textContent = `Stöd 1: ${formatMm(h1)} · Stöd 2: ${formatMm(h2)}`;
    if (bigReference) bigReference.textContent = step.reference || step.note || "";
    return true;
  }

  function renderWorkScreen(context) {
    const activeContext = context || currentContext();
    copySawCanvas();
    renderSupportView(activeContext);
    renderReadouts(activeContext);
    return activeContext;
  }

  function hasMinimumLogInput() {
    const root = Number($("rootDiameter")?.value || 0);
    const top = Number($("topDiameter")?.value || 0);
    const length = Number($("logLength")?.value || 0);
    return root > 0 && top > 0 && length > 0;
  }

  function activateWorkScreen() {
    const tabButton = global.document.querySelector('.tab[data-tab="bigTab"]');
    if (tabButton) tabButton.click();
    else {
      global.document.querySelectorAll(".tabPage").forEach((page) => page.classList.toggle("active", page.id === "bigTab"));
      global.document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === "bigTab"));
    }
    renderWorkScreen();
  }

  global.SawWorkScreen = {
    renderWorkScreen,
    activateWorkScreen,
    hasMinimumLogInput,
  };

  global.renderWorkScreen = renderWorkScreen;
})(window);
