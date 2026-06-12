// src/production-log.js
// Lokal produktionslogg för sågat virke.
//
// Loggen är avsedd som enkel summering i sågverket: dimension + längdklass + antal.
// Den räknar bara bitar som operatören uttryckligen godkänner.

(function initSawProductionLog(global) {
  const STORAGE_KEY = "sawapp.production.v1";

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

  function dimensionLabel(block) {
    if (!block) return "–";
    const width = Math.round(Number(block.width) || 0);
    const height = Math.round(Number(block.height) || 0);
    return `${width}×${height}`;
  }

  function currentProduct(context) {
    const active = context || currentContext();
    if (!active || !active.block) return null;
    const length = Number(active.block.usableLengthMm || active.v && active.v.logLength || 0);
    if (!length) return null;
    return {
      dimension: dimensionLabel(active.block),
      lengthClass: formatLengthClass(length),
      usableLengthMm: Math.round(length),
      lengthPct: Number(active.block.lengthPct || active.block.lengthRequirementPct || 100),
    };
  }

  function addCurrentProduct(context) {
    const product = currentProduct(context);
    if (!product) return false;
    const entries = readEntries();
    entries.push({ ...product, addedAt: new Date().toISOString() });
    writeEntries(entries);
    render();
    return true;
  }

  function skipCurrentProduct() {
    const status = $("productionLogStatus");
    if (status) status.textContent = "Senaste biten kasserades och räknades inte.";
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
    el.innerHTML = `
      <div class="productionLog">
        <div class="productionLogToolbar">
          <button id="productionAccept" type="button">Godkänn aktuell bit</button>
          <button id="productionSkip" type="button" class="secondary">Kassera</button>
          <button id="productionClear" type="button" class="secondary">Nollställ logg</button>
        </div>
        <div id="productionLogStatus" class="hint">Summerar godkända bitar lokalt i denna webbläsare.</div>
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

  function installWorkScreenControls() {
    const panel = global.document.querySelector(".bigDataPanel");
    if (!panel || $("bigProductionControls")) return;
    const controls = global.document.createElement("div");
    controls.id = "bigProductionControls";
    controls.className = "bigProductionControls";
    controls.innerHTML = `
      <button id="bigProductionAccept" type="button">Godkänn</button>
      <button id="bigProductionSkip" type="button" class="secondary">Kassera</button>
    `;
    const nav = panel.querySelector(".bigControls");
    if (nav) panel.insertBefore(controls, nav);
    else panel.appendChild(controls);

    const accept = $("bigProductionAccept");
    const skip = $("bigProductionSkip");
    if (accept) accept.onclick = () => addCurrentProduct();
    if (skip) skip.onclick = () => skipCurrentProduct();
  }

  global.SawProductionLog = {
    addCurrentProduct,
    skipCurrentProduct,
    render,
    readEntries,
    clear: () => writeEntries([]),
  };

  installYieldReplacement();
  installWorkScreenControls();
})(window);
