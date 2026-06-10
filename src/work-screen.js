// src/work-screen.js
// Arbetsskärm: speglar aktuell sågbild och visar sågvy/stödmått samt mätdata.

(function initSawWorkScreen(global) {
  function $(id) {
    return global.document.getElementById(id);
  }

  function numberFromInput(id) {
    const input = $(id);
    if (!input || input.value === "") return null;
    const value = Number(input.value);
    return Number.isFinite(value) ? value : null;
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

  function measureStatus(id, value) {
    if (value === null) return "empty";

    const ranges = {
      rootDiameter: [120, 800],
      topDiameter: [120, 800],
      rootEndDiameter: [120, 900],
      topEndDiameter: [100, 800],
      logLength: [1500, 8000],
      sweep: [0, 300],
      bark: [0, 80],
    };

    const [min, max] = ranges[id] || [0, Number.MAX_SAFE_INTEGER];
    return value >= min && value <= max ? "ok" : "warn";
  }

  function renderMeasuredData() {
    const target = $("bigMeasuredData");
    if (!target) return false;

    const rows = [
      ["rootDiameter", "Diameter stöd 1"],
      ["topDiameter", "Diameter stöd 2"],
      ["rootEndDiameter", "Rotända"],
      ["topEndDiameter", "Toppända"],
      ["logLength", "Stocklängd"],
      ["sweep", "Krokighet"],
      ["bark", "Bark"],
    ];

    target.innerHTML = rows.map(([id, label]) => {
      const value = numberFromInput(id);
      const status = measureStatus(id, value);
      const displayValue = value === null ? "–" : formatMm(value);
      const note = status === "warn" ? "Kontrollera" : status === "ok" ? "OK" : "Ej angivet";
      return `
        <div class="measureRow measure-${status}">
          <span>${label}</span>
          <strong>${displayValue}</strong>
          <em>${note}</em>
        </div>
      `;
    }).join("");

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

    const bigS1 = $("bigSupport1Value");
    const bigS2 = $("bigSupport2Value");
    if (bigS1) bigS1.textContent = formatMm(h1);
    if (bigS2) bigS2.textContent = formatMm(h2);

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
    const index = (context.stepIndex || 0) + 1;
    const total = context.activePlanLength || 0;
    const length = numberFromInput("logLength");

    const bigStep = $("bigStep");
    const bigRotation = $("bigRotation");
    const bigReference = $("bigReference");

    if (!step) {
      if (bigStep) bigStep.textContent = "Ingen sågplan";
      if (bigRotation) bigRotation.textContent = "Ange stöd 1, stöd 2 och längd.";
      if (bigReference) bigReference.textContent = length ? `Längd ${formatMm(length)}` : "";
      const bigS1 = $("bigSupport1Value");
      const bigS2 = $("bigSupport2Value");
      if (bigS1) bigS1.textContent = "–";
      if (bigS2) bigS2.textContent = "–";
      return true;
    }

    const cut = step.cut || (
      step.kind === "slab" ? "Ta bort ytterdel" :
      step.kind === "side" ? `Frigör ${step.label}` :
      step.label ? `Blocka ${step.label}` : ""
    );

    if (bigStep) bigStep.textContent = `Snitt ${index} av ${total}`;
    if (bigRotation) bigRotation.textContent = `Rotation ${step.rotation || "–"} – ${cut}`;
    if (bigReference) bigReference.textContent = `${step.reference || step.note || ""}${length ? ` · Längd ${formatMm(length)}` : ""}`;
    return true;
  }

  function renderWorkScreen(context) {
    const activeContext = context || currentContext();
    copySawCanvas();
    renderSupportView(activeContext);
    renderReadouts(activeContext);
    renderMeasuredData();
    return activeContext;
  }

  function hasMinimumLogInput() {
    const root = numberFromInput("rootDiameter");
    const top = numberFromInput("topDiameter");
    const length = numberFromInput("logLength");
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
