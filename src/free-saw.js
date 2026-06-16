// src/free-saw.js
// Frisågning: manuell registrering av vad som faktiskt blev sågat.

(function initSawFreeSaw(global) {
  function $(id) { return global.document.getElementById(id); }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function latestEntry() {
    const entries = global.SawProductionLog && typeof global.SawProductionLog.readEntries === "function"
      ? global.SawProductionLog.readEntries()
      : [];
    return entries.length ? { entry: entries[entries.length - 1], index: entries.length - 1 } : null;
  }

  function lengthCmForEntry(entry) {
    const mm = Number(entry && entry.usableLengthMm) || 0;
    if (!mm) return "";
    const cm = mm / 10;
    return Number.isInteger(cm) ? String(cm.toFixed(0)) : String(Number(cm.toFixed(1)));
  }

  function renderLatest() {
    const target = $("freeSawLatest");
    if (!target) return false;
    const latest = latestEntry();
    if (!latest) {
      target.innerHTML = `<div class="status-bad">Ingen registrerad sågning ännu.</div>`;
      return true;
    }
    const { entry, index } = latest;
    target.innerHTML = `
      <h3>Senaste registrerade</h3>
      <div class="freeSawLatestCard">
        <label>Dimension <input id="freeSawLatestDimension" value="${escapeHtml(entry.dimension || "")}"></label>
        <label>Längd <input id="freeSawLatestLength" type="number" inputmode="decimal" step="1" value="${escapeHtml(lengthCmForEntry(entry))}"><span>cm</span></label>
        <label>Kommentar <input id="freeSawLatestNote" value="${escapeHtml(entry.note || "")}"></label>
        <button id="freeSawLatestSave" type="button">Spara ändring</button>
      </div>
    `;
    const save = $("freeSawLatestSave");
    if (save) save.onclick = () => {
      global.SawProductionLog.updateEntry(index, {
        dimension: $("freeSawLatestDimension").value,
        lengthCm: $("freeSawLatestLength").value,
        note: $("freeSawLatestNote").value,
      });
    };
    return true;
  }

  function renderTotals() {
    const target = $("freeSawTotals");
    if (!target || !global.SawProductionLog) return false;
    const rows = typeof global.SawProductionLog.summaryRows === "function" ? global.SawProductionLog.summaryRows() : [];
    if (!rows.length) {
      target.innerHTML = `<div class="status-bad">Ingen totalsummering ännu.</div>`;
      return true;
    }
    target.innerHTML = `
      <h3>Total</h3>
      <table class="productionTable productionSummaryTable">
        <thead><tr><th>Dimension</th><th>Längdklass</th><th>Antal</th></tr></thead>
        <tbody>${rows.map(row => `<tr><td>${escapeHtml(row.dimension)}</td><td>${escapeHtml(row.lengthClass)}</td><td><strong>${row.count}</strong></td></tr>`).join("")}</tbody>
      </table>
    `;
    return true;
  }

  function render() {
    renderLatest();
    renderTotals();
  }

  function addFromForm() {
    if (!global.SawProductionLog || typeof global.SawProductionLog.addManualEntry !== "function") return false;
    const dimension = $("freeSawDimension") ? $("freeSawDimension").value : "";
    const lengthCm = $("freeSawLength") ? $("freeSawLength").value : "";
    const note = $("freeSawNote") ? $("freeSawNote").value : "";
    const ok = global.SawProductionLog.addManualEntry({ dimension, lengthCm, note });
    if (ok) {
      const noteInput = $("freeSawNote");
      if (noteInput) noteInput.value = "";
      render();
    }
    return ok;
  }

  function install() {
    const add = $("freeSawAdd");
    if (add && add.dataset.installed !== "true") {
      add.dataset.installed = "true";
      add.onclick = addFromForm;
    }
    ["freeSawDimension", "freeSawLength", "freeSawNote"].forEach((id) => {
      const input = $(id);
      if (!input || input.dataset.enterInstalled === "true") return;
      input.dataset.enterInstalled = "true";
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        addFromForm();
      });
    });
    render();
  }

  global.SawFreeSaw = { install, render, addFromForm };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
