// src/free-saw.js
// Frisågning: manuell registrering av vad som faktiskt blev sågat.

(function initSawFreeSaw(global) {
  function $(id) { return global.document.getElementById(id); }

  let recognition = null;
  let listening = false;
  let voiceInstalled = false;

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

  function setStatus(message, kind) {
    const status = $("freeSawStatus");
    if (!status) return;
    status.textContent = message;
    status.className = `hint freeSawStatus ${kind || ""}`.trim();
  }

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/,/g, ".")
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/gånger|ganger|kryss|x/g, " x ")
      .replace(/millimeter|millimetrar|mm/g, " millimeter ")
      .replace(/centimeter|centimetrar|cm/g, " centimeter ")
      .replace(/meter|metrar|m/g, " meter ")
      .replace(/[.!?:;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function displayText(text) {
    return String(text || "")
      .trim()
      .replace(/\s*x\s*/i, "×")
      .replace(/^\w/, (char) => char.toUpperCase());
  }

  function parseLengthCm(text) {
    const normalized = normalizeText(text);
    const lengthMatch = normalized.match(/(?:langd|längd)\s+(\d+(?:\.\d+)?)(?:\s*(meter|centimeter|millimeter))?/);
    const directMeter = normalized.match(/\b(\d+(?:\.\d+)?)\s*meter\b/);
    const directCm = normalized.match(/\b(\d+(?:\.\d+)?)\s*centimeter\b/);
    const directMm = normalized.match(/\b(\d+(?:\.\d+)?)\s*millimeter\b/);

    if (lengthMatch) {
      const value = Number(lengthMatch[1]);
      const unit = lengthMatch[2] || "centimeter";
      if (!Number.isFinite(value)) return "";
      if (unit === "meter") return String(Math.round(value * 100));
      if (unit === "millimeter") return String(Math.round(value / 10));
      return String(Math.round(value));
    }
    if (directMeter) return String(Math.round(Number(directMeter[1]) * 100));
    if (directCm) return String(Math.round(Number(directCm[1])));
    if (directMm) return String(Math.round(Number(directMm[1]) / 10));
    return "";
  }

  function parseDimension(text) {
    const normalized = normalizeText(text);
    const size = normalized.match(/\b(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\b/);
    if (size) return `${Number(size[1]).toString()}×${Number(size[2]).toString()}`;

    const beforeLength = normalized.split(/\b(?:langd|längd)\b/)[0]
      .replace(/^registrera\s+/, "")
      .replace(/^sagat\s+/, "")
      .replace(/^sågat\s+/, "")
      .trim();
    if (beforeLength && !/^\d+(?:\.\d+)?$/.test(beforeLength)) return displayText(beforeLength);
    return "";
  }

  function parseNote(text, dimension, lengthCm) {
    const normalized = normalizeText(text);
    const noteMatch = normalized.match(/(?:kommentar|notering)\s+(.+)$/);
    if (noteMatch) return displayText(noteMatch[1]);
    if (/vildmarkspanel/.test(normalized) && dimension && !/vildmarkspanel/i.test(dimension)) return "Vildmarkspanel";
    return "";
  }

  function parseFreeSawSpeech(rawText) {
    const lengthCm = parseLengthCm(rawText);
    const dimension = parseDimension(rawText);
    const note = parseNote(rawText, dimension, lengthCm);
    if (!dimension && !lengthCm) return null;
    return { dimension, lengthCm, note, rawText };
  }

  function applyParsedSpeech(parsed, autoRegister) {
    if (!parsed) return false;
    const dim = $("freeSawDimension");
    const len = $("freeSawLength");
    const note = $("freeSawNote");
    if (dim && parsed.dimension) dim.value = parsed.dimension;
    if (len && parsed.lengthCm) len.value = parsed.lengthCm;
    if (note && parsed.note) note.value = parsed.note;

    const hasValues = dim && dim.value && len && len.value;
    if (autoRegister && hasValues) return addFromForm();
    setStatus(`Tolkade: ${dim && dim.value ? dim.value : "dimension saknas"}, ${len && len.value ? len.value + " cm" : "längd saknas"}. Tryck Registrera eller säg “registrera …”.`, "ok");
    return !!hasValues || !!parsed.dimension || !!parsed.lengthCm;
  }

  function recognitionCtor() {
    return global.SpeechRecognition || global.webkitSpeechRecognition || null;
  }

  function supportsSpeechRecognition() {
    return !!recognitionCtor();
  }

  function updateVoiceButton() {
    const button = $("freeSawVoiceToggle");
    if (!button) return;
    button.textContent = listening ? "Stoppa röstinmatning" : "Starta röstinmatning";
    button.classList.toggle("voiceListening", listening);
  }

  function createRecognition() {
    const Ctor = recognitionCtor();
    if (!Ctor) return null;
    const instance = new Ctor();
    instance.lang = "sv-SE";
    instance.continuous = true;
    instance.interimResults = false;
    instance.maxAlternatives = 3;
    instance.onstart = () => {
      listening = true;
      updateVoiceButton();
      setStatus("Lyssnar… säg t.ex. “registrera 18 gånger 18 längd 420” eller “vildmarkspanel längd 420”.", "listening");
    };
    instance.onend = () => {
      listening = false;
      updateVoiceButton();
    };
    instance.onerror = (event) => {
      listening = false;
      updateVoiceButton();
      setStatus(`Röstfel: ${event.error || "okänt fel"}.`, "warn");
    };
    instance.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const alternatives = Array.from(result).map((item) => item.transcript);
        const applied = alternatives.some((alternative) => {
          const normalized = normalizeText(alternative);
          const autoRegister = /^registrera\b|^spara\b|^sagat\b|^sågat\b/.test(normalized);
          return applyParsedSpeech(parseFreeSawSpeech(alternative), autoRegister);
        });
        if (!applied && alternatives.length) setStatus(`Jag hörde: “${alternatives[0]}”. Säg t.ex. “registrera 18 gånger 18 längd 420”.`, "warn");
      }
    };
    return instance;
  }

  function startVoice() {
    if (!supportsSpeechRecognition()) {
      setStatus("Röstinmatning stöds inte i den här webbläsaren. Prova Chrome eller Edge.", "warn");
      return;
    }
    if (!recognition) recognition = createRecognition();
    if (!recognition || listening) return;
    try {
      recognition.start();
    } catch (error) {
      setStatus(`Kunde inte starta röstinmatning: ${error.message}`, "warn");
    }
  }

  function stopVoice() {
    if (recognition && listening) recognition.stop();
  }

  function toggleVoice() {
    if (listening) stopVoice();
    else startVoice();
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
    const voice = $("freeSawVoiceToggle");
    if (voice && !voiceInstalled) {
      voiceInstalled = true;
      voice.onclick = toggleVoice;
      if (!supportsSpeechRecognition()) voice.disabled = true;
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
    updateVoiceButton();
    render();
  }

  global.SawFreeSaw = { install, render, addFromForm, parseFreeSawSpeech, startVoice, stopVoice, toggleVoice };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
