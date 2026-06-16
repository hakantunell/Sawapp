// src/work-screen.js
// Arbetsskärm: speglar aktuell sågbild och visar stockprofil/stödmått samt mätdata.

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

  function formatBladeHeight(value) {
    if (global.SawFormat && typeof global.SawFormat.formatBladeHeight === "function") {
      return global.SawFormat.formatBladeHeight(value);
    }
    if (typeof global.formatBladeHeight === "function") return global.formatBladeHeight(value);
    return formatMm(value);
  }

  function formatCm(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "–";
    const cm = number / 10;
    return Number.isInteger(cm) ? `${cm.toFixed(0)} cm` : `${cm.toFixed(1)} cm`;
  }

  function cmValueForInput(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    const cm = number / 10;
    return Number.isInteger(cm) ? String(cm.toFixed(0)) : String(Number(cm.toFixed(1)));
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

  function measuredDiameterCount() {
    return ["rootDiameter", "topDiameter", "rootEndDiameter", "topEndDiameter"]
      .map(numberFromInput)
      .filter((value) => value > 0).length;
  }

  function hasMinimumLogInput() {
    const length = numberFromInput("logLength");
    return length > 0 && measuredDiameterCount() >= 2;
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
    };

    const [min, max] = ranges[id] || [0, Number.MAX_SAFE_INTEGER];
    return value >= min && value <= max ? "ok" : "warn";
  }

  function setMeasuredFieldFromWorkScreen(fieldId, valueCm) {
    const source = $(fieldId);
    if (!source) return false;

    if (valueCm === "" || valueCm === null || typeof valueCm === "undefined") {
      source.value = "";
    } else {
      const number = Number(String(valueCm).replace(",", "."));
      if (!Number.isFinite(number)) return false;
      source.value = String(Math.round(number * 10));
    }

    source.dispatchEvent(new global.Event("input", { bubbles: true }));
    source.dispatchEvent(new global.Event("change", { bubbles: true }));
    if (global.SawState && typeof global.SawState.resetCurrentStepIndex === "function") global.SawState.resetCurrentStepIndex();
    if (typeof global.update === "function") global.update();
    return true;
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
    ];

    target.innerHTML = rows.map(([id, label]) => {
      const value = numberFromInput(id);
      const status = measureStatus(id, value);
      const inputValue = value === null ? "" : cmValueForInput(value);
      const note = status === "warn" ? "Kontrollera" : status === "ok" ? "OK" : "Ej angivet";
      return `
        <div class="measureRow measure-${status}">
          <span>${label}</span>
          <input class="measureInput" data-measure-field="${id}" type="number" inputmode="decimal" step="0.1" value="${inputValue}" aria-label="${label} i centimeter">
          <strong>cm</strong>
          <em>${note}</em>
        </div>
      `;
    }).join("");

    target.querySelectorAll(".measureInput").forEach((input) => {
      const apply = () => setMeasuredFieldFromWorkScreen(input.dataset.measureField, input.value);
      input.addEventListener("change", apply);
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        input.blur();
        apply();
      });
    });

    return true;
  }

  function clearSupportHeightReadouts() {
    const bigS1 = $("bigSupport1Value");
    const bigS2 = $("bigSupport2Value");
    if (bigS1) bigS1.textContent = "–";
    if (bigS2) bigS2.textContent = "–";
  }

  function ensureSimpleLogProfileView(container) {
    if (!container) return null;
    let view = container.querySelector(".simpleLogProfile");
    if (view) return view;
    container.innerHTML = `<div class="simpleLogProfile"></div>`;
    return container.querySelector(".simpleLogProfile");
  }

  function pointPercent(point, length) {
    if (!length) return 0;
    return Math.max(0, Math.min(100, (Number(point.x) || 0) / length * 100));
  }

  function markerPercentOnStock(point, length) {
    const profileStart = 7;
    const profileWidth = 86;
    return profileStart + pointPercent(point, length) * profileWidth / 100;
  }

  function displayLabelForProfilePoint(point, points) {
    if (!point) return "";
    if (point.key === "support1") return "Stöd 1";
    if (point.key === "support2") return "Stöd 2";

    const leftEnd = points.find((p) => p.key === "rootEnd") || points[0];
    const rightEnd = points.find((p) => p.key === "topEnd") || points[points.length - 1];
    const leftValue = Number(leftEnd && leftEnd.value) || 0;
    const rightValue = Number(rightEnd && rightEnd.value) || 0;
    const rootIsRight = rightValue > leftValue;

    if (point.key === "rootEnd") return rootIsRight ? "Toppända" : "Rotända";
    if (point.key === "topEnd") return rootIsRight ? "Rotända" : "Toppända";
    return point.label || "";
  }

  function renderSimpleLogProfileInto(container, context) {
    if (!container) return false;
    const view = ensureSimpleLogProfileView(container);
    if (!view) return false;

    const length = numberFromInput("logLength") || 0;
    const geom = context && context.geom;
    const points = geom && Array.isArray(geom.diameterProfile) ? geom.diameterProfile : [];
    const enoughInput = length > 0 && measuredDiameterCount() >= 2 && geom && geom.hasEnoughDiameterInput;

    if (!length || measuredDiameterCount() < 2) {
      view.innerHTML = `
        <div class="simpleLogHint">Ange längd och minst två diametermått för att räkna fram stockprofilen.</div>
        <div class="simpleLogBox simpleLogBox-empty"></div>
      `;
      return false;
    }

    if (!enoughInput || !points.length) {
      view.innerHTML = `
        <div class="simpleLogHint">Stockprofil saknas.</div>
        <div class="simpleLogBox simpleLogBox-empty"></div>
      `;
      return false;
    }

    const leftEnd = points.find((p) => p.key === "rootEnd") || points[0];
    const rightEnd = points.find((p) => p.key === "topEnd") || points[points.length - 1];
    const maxD = Math.max(...points.map((p) => Number(p.value) || 0), 1);
    const minD = Math.min(...points.map((p) => Number(p.value) || Infinity));
    const minHeight = 34;
    const maxHeight = 98;
    const span = Math.max(1, maxD - minD);
    const scaledHeight = (value) => minHeight + ((Number(value) || 0) - minD) / span * (maxHeight - minHeight);
    const leftHeight = scaledHeight(leftEnd.value);
    const rightHeight = scaledHeight(rightEnd.value);
    const polygon = `0,${(maxHeight - leftHeight) / 2} 100,${(maxHeight - rightHeight) / 2} 100,${(maxHeight + rightHeight) / 2} 0,${(maxHeight + leftHeight) / 2}`;
    const rootSide = (Number(rightEnd.value) || 0) > (Number(leftEnd.value) || 0) ? "höger" : "vänster";

    const pointHtml = points.map((point) => {
      const left = markerPercentOnStock(point, length);
      const marker = point.source === "measured" ? "●" : "○";
      const cls = point.source === "measured" ? "measured" : "calculated";
      const label = displayLabelForProfilePoint(point, points);
      return `
        <div class="simpleLogPoint ${cls}" style="left:${left}%">
          <div class="simpleLogMarker">${marker}</div>
          <div class="simpleLogValue">${formatCm(point.value)}</div>
          <div class="simpleLogLabel">${label}</div>
        </div>
      `;
    }).join("");

    view.innerHTML = `
      <div class="simpleLogLegend"><span>● mätt</span><span>○ framräknad</span><span>Längd ${formatCm(length)}</span><span>Rot åt ${rootSide}</span></div>
      <div class="simpleLogBox">
        <svg viewBox="0 0 100 ${maxHeight}" preserveAspectRatio="none" class="simpleLogSvg" aria-hidden="true">
          <polygon points="${polygon}" />
        </svg>
        ${pointHtml}
      </div>
    `;
    return true;
  }

  function renderSimpleLogProfiles(context) {
    renderSimpleLogProfileInto($("bigLogProfile"), context);
    renderSimpleLogProfileInto($("planLogProfile"), context);
  }

  function renderSupportView(context) {
    renderSimpleLogProfiles(context);

    if (!hasMinimumLogInput() || !context || !context.step) {
      clearSupportHeightReadouts();
      return false;
    }

    const step = context.step;
    const h1 = Number.isFinite(step.rootSupportHeight) ? step.rootSupportHeight : step.bladeToBed || 0;
    const h2 = Number.isFinite(step.topSupportHeight) ? step.topSupportHeight : step.bladeToBed || 0;

    const bigS1 = $("bigSupport1Value");
    const bigS2 = $("bigSupport2Value");
    if (bigS1) bigS1.textContent = formatBladeHeight(h1);
    if (bigS2) bigS2.textContent = formatBladeHeight(h2);

    return true;
  }

  function renderReadouts(context) {
    if (!context || !hasMinimumLogInput()) {
      const length = numberFromInput("logLength");
      const count = measuredDiameterCount();
      const bigStep = $("bigStep");
      const bigRotation = $("bigRotation");
      const bigReference = $("bigReference");
      if (bigStep) bigStep.textContent = "Ingen komplett sågplan";
      if (bigRotation) bigRotation.textContent = "Ange längd och minst två diametermått.";
      if (bigReference) bigReference.textContent = `${length ? `Längd ${formatCm(length)}` : "Längd saknas"} · Diametermått ${count} av 2`;
      clearSupportHeightReadouts();
      return true;
    }

    const step = context.step;
    const index = (context.stepIndex || 0) + 1;
    const total = context.activePlanLength || 0;
    const length = numberFromInput("logLength");

    const bigStep = $("bigStep");
    const bigRotation = $("bigRotation");
    const bigReference = $("bigReference");

    if (!step) {
      if (bigStep) bigStep.textContent = "Ingen sågplan";
      if (bigRotation) bigRotation.textContent = "Ange längd och minst två diametermått.";
      if (bigReference) bigReference.textContent = length ? `Längd ${formatCm(length)}` : "";
      clearSupportHeightReadouts();
      return true;
    }

    const cut = step.cut || (
      step.kind === "slab" ? "Ta bort ytterdel" :
      step.kind === "side" ? `Frigör ${step.label}` :
      step.label ? `Blocka ${step.label}` : ""
    );

    if (bigStep) bigStep.textContent = `Snitt ${index} av ${total}`;
    if (bigRotation) bigRotation.textContent = `Rotation ${step.rotation || "–"} – ${cut}`;
    if (bigReference) bigReference.textContent = `${step.reference || step.note || ""}${length ? ` · Längd ${formatCm(length)}` : ""}`;
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
