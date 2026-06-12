// src/production-log.js
// Lokal produktionslogg för sågat virke.
//
// Loggen är avsedd som enkel summering i sågverket: dimension + längdklass + antal.
// Den räknar bara bitar som operatören uttryckligen godkänner när aktuell
// sågplansrad faktiskt motsvarar en färdig bit.

(function initSawProductionLog(global) {
  const STORAGE_KEY = "sawapp.production.v1";
  let lastDecidedProductKey = null;

  function $(id) {
    return global.document.getElementById(id);
  }

  function readEntries() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Kunde inte läsa produktionslogg.", error);
      return [];
    }
  }

  function writeEntries(entries) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (error) {
      console.warn("Kunde inte spara produktionslogg.", error);
      return false;
    }
  }

  function currentContext() {
    if (global.SawUpdatePipeline && typeof global.SawUpdatePipeline.buildPlanContext === "function") {
      return global.SawUpdatePipeline.buildPlanContext();
    }
    return null;
  }

  function formatLengthClass(mm) {
    const metres = Math.max(0, Number(mm) || 0) / 1000;
    const flooredHalfMetre = Math.floor(metres * 2) / 2;
    return `${flooredHalfMetre.toFixed(1).replace(".", ",")} m`;
  }

  function dimensionLabelFromSize(width, height) {
    const w = Math.round(Number(width) || 0);
    const h = Math.round(Number(height) || 0);
    return `${w}×${h}`;
  }

  function blockLabel(block) {
    if (!block) return "–";
    return dimensionLabelFromSize(block.width, block.height);
  }

  function setStatus(message) {
    const status = $("productionLogStatus");
    if (status) status.textContent = message;
  }

  function isLastStep(context) {
    if (!context) return false;
    return Number(context.stepIndex || 0) >= Math.max(0, Number(context.activePlanLength || 0) - 1);
  }

  function productKey(context, product) {
    if (!context || !product) return "";
    const step = context.step || {};
    const values = context.v || context.values || {};
    return [
      Number(context.stepIndex || 0),
      Number(context.activePlanLength || 0),
      step.kind || "",
      step.label || "",
      step.rotation || "",
      product.dimension,
      product.lengthClass,
      Math.round(Number(values.logLength) || 0),
      Math.round(Number(values.rootDiameter) || 0),
      Math.round(Number(values.topDiameter) || 0),
      Math.round(Number(values.rootEndDiameter) || 0),
      Math.round(Number(values.topEndDiameter) || 0),
    ].join("|");
  }

  function productFromSawmillStep(context) {
    const step = context && context.step;
    if (!step) return null;

    const stockLength = Number((context.v && context.v.logLength) || (context.values && context.values.logLength) || 0);

    if (step.kind === "side" && step.source) {
      const source = step.source;
      return {
        dimension: source.label || dimensionLabelFromSize(source.w, source.h),
        lengthClass: formatLengthClass(stockLength),
        usableLengthMm: Math.round(stockLength),
        productKind: "side",
      };
    }

    if (step.kind === "center" && isLastStep(context)) {
      const source = step.source || context.block;
      return {
        dimension: source && source.label ? source.label : blockLabel(context.block || source),
        lengthClass: formatLengthClass(Number((context.block && context.block.usableLengthMm) || stockLength)),
        usableLengthMm: Math.round(Number((context.block && context.block.usableLengthMm) || stockLength)),
        productKind: "center",
      };
    }

    return null;
  }

  function productFromTimberPlan(context) {
    if (!context || !context.block || !isLastStep(context)) return null;
    const stockLength = Number((context.v && context.v.logLength) || (context.values && context.values.logLength) || 0);
    const usableLength = Number(context.block.usableLengthMm || stockLength || 0);
    if (!usableLength) return null;
    return {
      dimension: blockLabel(context.block),
      lengthClass: formatLengthClass(usableLength),
      usableLengthMm: Math.round(usableLength),
      lengthPct: Number(context.block.lengthPct || context.block.lengthRequirementPct || 100),
      productKind: "center",
    };
  }

  function currentProduct(context) {
    const active = context || currentContext();
    if (!active) return null;

    const product = Array.isArray(active.sawmillCutPlan) && active.sawmillCutPlan.length
      ? productFromSawmillStep(active)
      : productFromTimberPlan(active);

    if (!product) return null;
    if (productKey(active, product) === lastDecidedProductKey) return null;
    return product;
  }

  function pendingProductText(context) {
    const product = currentProduct(context);
    if (product) return `${product.dimension}, ${product.lengthClass}`;
    const active = context || currentContext();
    if (!active || !active.step) return "Ingen färdig bit att godkänna.";
    if (Array.isArray(active.sawmillCutPlan) && active.sawmillCutPlan.length) {
      if (active.step.kind === "slab") return "Yttersnitt/slabba räknas inte som färdig bit.";
      if (active.step.kind === "center") return "Kärnblocket kan godkännas efter sista kärnsnittet.";
    }
    if (lastDecidedProductKey) return "Den färdiga biten är redan hanterad. Gå vidare eller börja med ny stock.";
    return "Aktuell bit kan godkännas först efter sista snittet.";
  }

  function moveToNextStepAfterDecision(context) {
    const active = context || currentContext();
    if (!active) return false;

    const currentIndex = Number(active.stepIndex || 0);
    const lastIndex = Math.max(0, Number(active.activePlanLength || 0) - 1);
    if (currentIndex < lastIndex) {
      if (global.SawState && typeof global.SawState.setCurrentStepIndex === "function") {
        global.SawState.setCurrentStepIndex(currentIndex + 1);
      }
      if (typeof global.update === "function") global.update();
      return true;
    }

    render();
    updateWorkScreenButtons();
    return false;
  }

  function addCurrentProduct(context) {
    const active = context || currentContext();
    const product = currentProduct(active);
    if (!product) {
      setStatus(pendingProductText(active));
      return false;
    }

    const key = productKey(active, product);
    const entries = readEntries();
    entries.push({ ...product, addedAt: new Date().toISOString() });
    writeEntries(entries);
    lastDecidedProductKey = key;

    const moved = moveToNextStepAfterDecision(active);
    setStatus(moved
      ? `Godkänd: ${product.dimension}, ${product.lengthClass}. Gick vidare till nästa snitt.`
      : `Godkänd: ${product.dimension}, ${product.lengthClass}. Börja med ny stock.`);
    return true;
  }

  function skipCurrentProduct(context) {
    const active = context || currentContext();
    const product = currentProduct(active);
    if (!product) {
      setStatus("Ingen färdig bit att kassera just nu.");
      return false;
    }

    lastDecidedProductKey = productKey(active, product);
    const moved = moveToNextStepAfterDecision(active);
    setStatus(moved
      ? `Kasserad: ${product.dimension}, ${product.lengthClass}. Gick vidare till nästa snitt.`
      : `Kasserad: ${product.dimension}, ${product.lengthClass}. Börja med ny stock.`);
    return true;
  }

  function summaryRows() {
    const map = new Map();
    for (const entry of readEntries()) {
      const key = `${entry.dimension}|${entry.lengthClass}`;
      const existing = map.get(key) || { dimension: entry.dimension, lengthClass: entry.lengthClass, count: 0 };
      existing.count += 1;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.dimension !== b.dimension) return a.dimension.localeCompare(b.dimension, "sv");
      return a.lengthClass.localeCompare(b.lengthClass, "sv");
    });
  }

  function render(target) {
    const el = target || $("sideYield");
    if (!el) return false;
    const rows = summaryRows();
    const product = currentProduct();
    el.innerHTML = `
      <div class="productionLog">
        <div class="productionLogToolbar">
          <button id="productionAccept" type="button" ${product ? "" : "disabled"}>Godkänn + gå vidare</button>
          <button id="productionSkip" type="button" class="secondary" ${product ? "" : "disabled"}>Kassera + gå vidare</button>
          <button id="productionClear" type="button" class="secondary">Nollställ logg</button>
        </div>
        <div id="productionLogStatus" class="hint">${product ? `Färdig bit: ${product.dimension}, ${product.lengthClass}.` : pendingProductText()}</div>
        ${rows.length ? `
          <table class="productionTable">
            <thead><tr><th>Dimension</th><th>Längdklass</th><th>Antal</th></tr></thead>
            <tbody>
              ${rows.map(row => `<tr><td>${row.dimension}</td><td>${row.lengthClass}</td><td><strong>${row.count}</strong></td></tr>`).join("")}
            </tbody>
          </table>
        ` : `<div class="status-bad">Inget godkänt virke registrerat ännu.</div>`}
      </div>
    `;

    const accept = $("productionAccept");
    const skip = $("productionSkip");
    const clear = $("productionClear");
    if (accept) accept.onclick = () => addCurrentProduct();
    if (skip) skip.onclick = () => skipCurrentProduct();
    if (clear) clear.onclick = () => {
      if (global.confirm && !global.confirm("Nollställa produktionsloggen?")) return;
      writeEntries([]);
      render();
    };
    updateWorkScreenButtons();
    return true;
  }

  function installYieldReplacement() {
    global.renderSideYield = function renderProductionInsteadOfSideYield() {
      return render();
    };
    global.renderPackingResult = function renderProductionInsteadOfPackingResult() {
      return render();
    };
  }

  function updateWorkScreenButtons() {
    const product = currentProduct();
    const accept = $("bigProductionAccept");
    const skip = $("bigProductionSkip");
    if (accept) {
      accept.disabled = !product;
      accept.textContent = product ? "Godkänn + nästa" : "Vänta";
      accept.title = product ? `Godkänn ${product.dimension}, ${product.lengthClass} och gå vidare` : pendingProductText();
    }
    if (skip) {
      skip.disabled = !product;
      skip.textContent = product ? "Kassera + nästa" : "Kassera";
      skip.title = product ? `Kassera ${product.dimension}, ${product.lengthClass} och gå vidare` : pendingProductText();
    }
  }

  function installWorkScreenControls() {
    const panel = global.document.querySelector(".bigDataPanel");
    if (!panel || $("bigProductionControls")) return;
    const controls = global.document.createElement("div");
    controls.id = "bigProductionControls";
    controls.className = "bigProductionControls";
    controls.innerHTML = `
      <button id="bigProductionAccept" type="button">Godkänn + nästa</button>
      <button id="bigProductionSkip" type="button" class="secondary">Kassera + nästa</button>
    `;
    const nav = panel.querySelector(".bigControls");
    if (nav) panel.insertBefore(controls, nav);
    else panel.appendChild(controls);

    const accept = $("bigProductionAccept");
    const skip = $("bigProductionSkip");
    if (accept) accept.onclick = () => addCurrentProduct();
    if (skip) skip.onclick = () => skipCurrentProduct();
    updateWorkScreenButtons();
  }

  global.SawProductionLog = {
    addCurrentProduct,
    skipCurrentProduct,
    render,
    readEntries,
    currentProduct,
    clear: () => writeEntries([]),
  };

  installYieldReplacement();
  installWorkScreenControls();
})(window);
