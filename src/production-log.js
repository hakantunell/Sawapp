// src/production-log.js
// Lokal produktionslogg för sågat virke.

(function initSawProductionLog(global) {
  const STORAGE_KEY = "sawapp.production.v1";
  const decidedProductKeys = new Set();

  function $(id) { return global.document.getElementById(id); }

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
    if (global.SawUpdatePipeline && typeof global.SawUpdatePipeline.buildPlanContext === "function") return global.SawUpdatePipeline.buildPlanContext();
    return null;
  }

  function formatLengthClass(mm) {
    const metres = Math.max(0, Number(mm) || 0) / 1000;
    const flooredHalfMetre = Math.floor(metres * 2) / 2;
    return `${flooredHalfMetre.toFixed(1).replace(".", ",")} m`;
  }

  function parseLengthClassToMm(lengthClass) {
    const text = String(lengthClass || "").trim().replace(",", ".");
    const match = text.match(/(\d+(?:\.\d+)?)/);
    if (!match) return 0;
    return Math.round(Number(match[1]) * 1000);
  }

  function lengthCmForEntry(entry) {
    const mm = Number(entry && entry.usableLengthMm) || parseLengthClassToMm(entry && entry.lengthClass);
    if (!mm) return "";
    const cm = mm / 10;
    return Number.isInteger(cm) ? String(cm.toFixed(0)) : String(Number(cm.toFixed(1)));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    const editStatus = $("productionEditStatus");
    if (editStatus) editStatus.textContent = message;
    const freeStatus = $("freeSawStatus");
    if (freeStatus) freeStatus.textContent = message;
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
      product.productKind || "",
      product.dimension,
      product.lengthClass,
      Math.round(Number(values.logLength) || 0),
      Math.round(Number(values.rootDiameter) || 0),
      Math.round(Number(values.topDiameter) || 0),
      Math.round(Number(values.rootEndDiameter) || 0),
      Math.round(Number(values.topEndDiameter) || 0),
    ].join("|");
  }

  function isDecided(context, product) { return decidedProductKeys.has(productKey(context, product)); }
  function rememberDecision(context, product) { decidedProductKeys.add(productKey(context, product)); }

  function centerProduct(context, stockLength) {
    if (!context || !context.block) return null;
    const usableLength = Number((context.block && context.block.usableLengthMm) || stockLength || 0);
    if (!usableLength) return null;
    return {
      dimension: blockLabel(context.block),
      lengthClass: formatLengthClass(usableLength),
      usableLengthMm: Math.round(usableLength),
      lengthPct: Number(context.block.lengthPct || context.block.lengthRequirementPct || 100),
      productKind: "center",
    };
  }

  function productFromSawmillStep(context) {
    const step = context && context.step;
    if (!step) return null;
    const stockLength = Number((context.v && context.v.logLength) || (context.values && context.values.logLength) || 0);

    if (step.kind === "side" && step.source) {
      const source = step.source;
      const sideProduct = {
        dimension: source.label || dimensionLabelFromSize(source.w, source.h),
        lengthClass: formatLengthClass(stockLength),
        usableLengthMm: Math.round(stockLength),
        productKind: "side",
      };
      if (!isDecided(context, sideProduct)) return sideProduct;

      if (isLastStep(context)) {
        const blockProduct = centerProduct(context, stockLength);
        if (blockProduct && !isDecided(context, blockProduct)) return blockProduct;
      }
      return null;
    }

    if (step.kind === "center" && isLastStep(context)) {
      const blockProduct = centerProduct(context, stockLength);
      return blockProduct && !isDecided(context, blockProduct) ? blockProduct : null;
    }

    return null;
  }

  function productFromTimberPlan(context) {
    if (!context || !context.block || !isLastStep(context)) return null;
    const stockLength = Number((context.v && context.v.logLength) || (context.values && context.values.logLength) || 0);
    const product = centerProduct(context, stockLength);
    return product && !isDecided(context, product) ? product : null;
  }

  function currentProduct(context) {
    const active = context || currentContext();
    if (!active) return null;
    return Array.isArray(active.sawmillCutPlan) && active.sawmillCutPlan.length
      ? productFromSawmillStep(active)
      : productFromTimberPlan(active);
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
    if (decidedProductKeys.size) return "Den färdiga biten är redan hanterad. Gå vidare eller börja med ny stock.";
    return "Aktuell bit kan godkännas först efter sista snittet.";
  }

  function clearCurrentStockInputs() {
    ["rootDiameter", "topDiameter", "rootEndDiameter", "topEndDiameter", "logLength", "sweep"].forEach((id) => {
      const input = $(id);
      if (!input) return;
      input.value = "";
      input.dispatchEvent(new global.Event("input", { bubbles: true }));
      input.dispatchEvent(new global.Event("change", { bubbles: true }));
    });
  }

  function startNewStockAfterDecision() {
    decidedProductKeys.clear();
    clearCurrentStockInputs();
    if (global.SawState && typeof global.SawState.resetCurrentStepIndex === "function") global.SawState.resetCurrentStepIndex();
    if (typeof global.update === "function") global.update();
    if (global.SawWorkScreen && typeof global.SawWorkScreen.renderWorkScreen === "function") global.SawWorkScreen.renderWorkScreen();
    refreshViews();
  }

  function moveToNextStepAfterDecision(context) {
    const active = context || currentContext();
    if (!active) return { moved: false, newStock: false, moreProduct: false };

    const remainingProduct = currentProduct(active);
    if (remainingProduct) {
      refreshViews();
      updateWorkScreenButtons();
      return { moved: false, newStock: false, moreProduct: true, remainingProduct };
    }

    const currentIndex = Number(active.stepIndex || 0);
    const lastIndex = Math.max(0, Number(active.activePlanLength || 0) - 1);
    if (currentIndex < lastIndex) {
      if (global.SawState && typeof global.SawState.setCurrentStepIndex === "function") global.SawState.setCurrentStepIndex(currentIndex + 1);
      if (typeof global.update === "function") global.update();
      return { moved: true, newStock: false, moreProduct: false };
    }

    startNewStockAfterDecision();
    return { moved: false, newStock: true, moreProduct: false };
  }

  function decisionStatus(prefix, product, result) {
    if (result.moreProduct && result.remainingProduct) return `${prefix}: ${product.dimension}, ${product.lengthClass}. Färdig bit kvar: ${result.remainingProduct.dimension}, ${result.remainingProduct.lengthClass}.`;
    return result.newStock
      ? `${prefix}: ${product.dimension}, ${product.lengthClass}. Ny stock – ange nya mått.`
      : `${prefix}: ${product.dimension}, ${product.lengthClass}. Gick vidare till nästa snitt.`;
  }

  function addCurrentProduct(context) {
    const active = context || currentContext();
    const product = currentProduct(active);
    if (!product) {
      setStatus(pendingProductText(active));
      return false;
    }

    const entries = readEntries();
    entries.push({ ...product, addedAt: new Date().toISOString() });
    writeEntries(entries);
    rememberDecision(active, product);

    const result = moveToNextStepAfterDecision(active);
    setStatus(decisionStatus("Godkänd", product, result));
    return true;
  }

  function addManualEntry({ dimension, lengthCm, note } = {}) {
    const dim = String(dimension || "").trim();
    const cm = Number(String(lengthCm || "").replace(",", "."));
    if (!dim || !Number.isFinite(cm) || cm <= 0) {
      setStatus("Ange dimension och längd för frisågning.");
      return false;
    }
    const usableLengthMm = Math.round(cm * 10);
    const entry = {
      dimension: dim,
      lengthClass: formatLengthClass(usableLengthMm),
      usableLengthMm,
      productKind: "free",
      note: String(note || "").trim(),
      addedAt: new Date().toISOString(),
    };
    const entries = readEntries();
    entries.push(entry);
    writeEntries(entries);
    refreshViews();
    setStatus(`Frisågning registrerad: ${entry.dimension}, ${entry.lengthClass}.`);
    return true;
  }

  function skipCurrentProduct(context) {
    const active = context || currentContext();
    const product = currentProduct(active);
    if (!product) {
      setStatus("Ingen färdig bit att kassera just nu.");
      return false;
    }

    rememberDecision(active, product);
    const result = moveToNextStepAfterDecision(active);
    setStatus(decisionStatus("Kasserad", product, result));
    return true;
  }

  function summaryRows() {
    const map = new Map();
    for (const entry of readEntries()) {
      const dimension = String(entry.dimension || "–").trim() || "–";
      const lengthClass = String(entry.lengthClass || formatLengthClass(entry.usableLengthMm)).trim() || "–";
      const key = `${dimension}|${lengthClass}`;
      const existing = map.get(key) || { dimension, lengthClass, count: 0 };
      existing.count += 1;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.dimension !== b.dimension) return a.dimension.localeCompare(b.dimension, "sv");
      return a.lengthClass.localeCompare(b.lengthClass, "sv");
    });
  }

  function updateEntry(index, patch) {
    const entries = readEntries();
    const entry = entries[index];
    if (!entry) return false;

    const next = { ...entry };
    if (Object.prototype.hasOwnProperty.call(patch, "dimension")) next.dimension = String(patch.dimension || "").trim() || "–";
    if (Object.prototype.hasOwnProperty.call(patch, "lengthCm")) {
      const cm = Number(String(patch.lengthCm || "").replace(",", "."));
      if (!Number.isFinite(cm) || cm <= 0) return false;
      next.usableLengthMm = Math.round(cm * 10);
      next.lengthClass = formatLengthClass(next.usableLengthMm);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "note")) next.note = String(patch.note || "").trim();

    next.editedAt = new Date().toISOString();
    entries[index] = next;
    writeEntries(entries);
    refreshViews();
    setStatus(`Ändrad: ${next.dimension}, ${next.lengthClass}.`);
    return true;
  }

  function deleteEntry(index) {
    const entries = readEntries();
    const entry = entries[index];
    if (!entry) return false;
    if (global.confirm && !global.confirm(`Ta bort ${entry.dimension || "bit"}, ${entry.lengthClass || "okänd längd"}?`)) return false;
    entries.splice(index, 1);
    writeEntries(entries);
    refreshViews();
    setStatus("Raden borttagen.");
    return true;
  }

  function renderSummaryTable(rows) {
    if (!rows.length) return `<div class="status-bad">Inget godkänt virke registrerat ännu.</div>`;
    return `
      <h3>Summering</h3>
      <table class="productionTable productionSummaryTable">
        <thead><tr><th>Dimension</th><th>Längdklass</th><th>Antal</th></tr></thead>
        <tbody>${rows.map(row => `<tr><td>${escapeHtml(row.dimension)}</td><td>${escapeHtml(row.lengthClass)}</td><td><strong>${row.count}</strong></td></tr>`).join("")}</tbody>
      </table>
    `;
  }

  function renderEntryTable(entries) {
    if (!entries.length) return `<div class="status-bad">Inga sågade bitar att redigera ännu.</div>`;
    return `
      <h3>Redigera sågade bitar</h3>
      <table class="productionTable productionEditTable">
        <thead><tr><th>#</th><th>Dimension</th><th>Längd</th><th>Typ</th><th>Kommentar</th><th></th></tr></thead>
        <tbody>
          ${entries.map((entry, index) => `
            <tr>
              <td>${index + 1}</td>
              <td><input class="productionDimensionInput" data-entry-index="${index}" value="${escapeHtml(entry.dimension || "")}" aria-label="Dimension för rad ${index + 1}"></td>
              <td><input class="productionLengthInput" data-entry-index="${index}" type="number" inputmode="decimal" step="1" value="${escapeHtml(lengthCmForEntry(entry))}" aria-label="Längd i centimeter för rad ${index + 1}"><span class="productionUnit">cm</span></td>
              <td>${entry.productKind === "free" ? "Frisågning" : "Sågplan"}</td>
              <td><input class="productionNoteInput" data-entry-index="${index}" value="${escapeHtml(entry.note || "")}" aria-label="Kommentar för rad ${index + 1}"></td>
              <td><button class="productionDelete secondary" type="button" data-entry-index="${index}">Ta bort</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function installEditHandlers(el) {
    el.querySelectorAll(".productionDimensionInput").forEach((input) => {
      const apply = () => updateEntry(Number(input.dataset.entryIndex), { dimension: input.value });
      input.addEventListener("change", apply);
      input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); input.blur(); apply(); } });
    });
    el.querySelectorAll(".productionLengthInput").forEach((input) => {
      const apply = () => updateEntry(Number(input.dataset.entryIndex), { lengthCm: input.value });
      input.addEventListener("change", apply);
      input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); input.blur(); apply(); } });
    });
    el.querySelectorAll(".productionNoteInput").forEach((input) => {
      const apply = () => updateEntry(Number(input.dataset.entryIndex), { note: input.value });
      input.addEventListener("change", apply);
      input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); input.blur(); apply(); } });
    });
    el.querySelectorAll(".productionDelete").forEach((button) => { button.onclick = () => deleteEntry(Number(button.dataset.entryIndex)); });
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
        <div id="productionLogStatus" class="hint">${product ? `Färdig bit: ${escapeHtml(product.dimension)}, ${escapeHtml(product.lengthClass)}.` : escapeHtml(pendingProductText())}</div>
        ${renderSummaryTable(rows)}
      </div>`;

    const accept = $("productionAccept");
    const skip = $("productionSkip");
    const clear = $("productionClear");
    if (accept) accept.onclick = () => addCurrentProduct();
    if (skip) skip.onclick = () => skipCurrentProduct();
    if (clear) clear.onclick = () => { if (global.confirm && !global.confirm("Nollställa produktionsloggen?")) return; writeEntries([]); refreshViews(); };
    updateWorkScreenButtons();
    return true;
  }

  function renderEditor(target) {
    const el = target || $("productionEditHost");
    if (!el) return false;
    const entries = readEntries();
    const rows = summaryRows();
    el.innerHTML = `
      <div class="productionLog productionLog-editor">
        <div id="productionEditStatus" class="hint">Ändra dimension, längd eller kommentar på enskilda sågade bitar.</div>
        ${renderSummaryTable(rows)}
        ${renderEntryTable(entries)}
      </div>`;
    installEditHandlers(el);
    return true;
  }

  function refreshViews() {
    render($("sideYield"));
    renderEditor($("productionEditHost"));
    if (global.SawFreeSaw && typeof global.SawFreeSaw.render === "function") global.SawFreeSaw.render();
  }

  function installYieldReplacement() {
    global.renderSideYield = function renderProductionInsteadOfSideYield() { return render(); };
    global.renderPackingResult = function renderProductionInsteadOfPackingResult() { return render(); };
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
    controls.innerHTML = `<button id="bigProductionAccept" type="button">Godkänn + nästa</button><button id="bigProductionSkip" type="button" class="secondary">Kassera + nästa</button>`;
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
    addManualEntry,
    skipCurrentProduct,
    render,
    renderEditor,
    refreshViews,
    readEntries,
    summaryRows,
    updateEntry,
    deleteEntry,
    currentProduct,
    clear: () => { writeEntries([]); refreshViews(); },
  };

  installYieldReplacement();
  installWorkScreenControls();
  renderEditor();
})(window);
