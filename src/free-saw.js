// src/free-saw.js
// Frisågning: manuell registrering av vad som faktiskt blev sågat.
// Använder samma gemensamma röstinmatning som sågskärmen.

(function initSawFreeSaw(global) {
  function $(id) { return global.document.getElementById(id); }

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

  function spokenLength(cmValue) {
    const cm = Number(String(cmValue || "").replace(",", "."));
    if (!Number.isFinite(cm) || cm <= 0) return "okänd längd";
    const metres = Math.floor(cm / 100);
    const rest = Math.round(cm - metres * 100);
    if (metres > 0 && rest > 0) return `${metres} meter ${rest}`;
    if (metres > 0) return `${metres} meter`;
    return `${Math.round(cm)} centimeter`;
  }

  function speak(text) {
    if (global.SawVoiceSpeechFeedback && typeof global.SawVoiceSpeechFeedback.speak === "function") {
      return global.SawVoiceSpeechFeedback.speak(text, { rate: 1.02 });
    }
    if (!global.speechSynthesis || !global.SpeechSynthesisUtterance) return false;
    try {
      global.speechSynthesis.cancel();
      const utterance = new global.SpeechSynthesisUtterance(text);
      utterance.lang = "sv-SE";
      utterance.rate = 1.02;
      global.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      return false;
    }
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

  function isFreeSawActive() {
    const tab = $("freeSawTab");
    return !!tab && tab.classList.contains("active");
  }

  function isWildPanel(text) {
    return /vildmarkspanel|vildmarks\s*panel|vildmark/.test(normalizeText(text));
  }

  function cleanCommandPrefix(text) {
    return normalizeText(text)
      .replace(/^(registrera|spara|sagat|sågat|korrigera|andra|ändra)\s+/, "")
      .trim();
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
      if (value > 0 && value < 20 && String(lengthMatch[1]).includes(".")) return String(Math.round(value * 100));
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
    if (size) {
      const base = `${Number(size[1]).toString()}×${Number(size[2]).toString()}`;
      return isWildPanel(text) ? `${base} vildmarkspanel` : base;
    }

    if (isWildPanel(text)) return "Vildmarkspanel";

    const beforeLength = cleanCommandPrefix(text).split(/\b(?:langd|längd)\b/)[0]
      .replace(/\b(kommentar|notering)\b.*$/, "")
      .trim();
    if (beforeLength && !/^\d+(?:\.\d+)?$/.test(beforeLength)) return displayText(beforeLength);
    return "";
  }

  function parseNote(text, dimension, lengthCm) {
    const normalized = normalizeText(text);
    const noteMatch = normalized.match(/(?:kommentar|notering)\s+(.+)$/);
    if (noteMatch) return displayText(noteMatch[1]);
    if (isWildPanel(text) && dimension && !/vildmarkspanel/i.test(dimension)) return "Vildmarkspanel";
    return "";
  }

  function parseFreeSawSpeech(rawText) {
    const lengthCm = parseLengthCm(rawText);
    const dimension = parseDimension(rawText);
    const note = parseNote(rawText, dimension, lengthCm);
    if (!dimension && !lengthCm && !note) return null;
    return { dimension, lengthCm, note, rawText };
  }

  function isExplicitFreeSawCommand(text) {
    const normalized = normalizeText(text);
    return /^(registrera|spara|sagat|sågat|korrigera|andra|ändra)\b/.test(normalized) || isWildPanel(text);
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
    if (hasValues) speak(`Tolkade ${dim.value}, längd ${spokenLength(len.value)}.`);
    return !!hasValues || !!parsed.dimension || !!parsed.lengthCm;
  }

  function correctLatest(parsed) {
    if (!parsed) return false;
    const latest = latestEntry();
    if (!latest || !global.SawProductionLog || typeof global.SawProductionLog.updateEntry !== "function") {
      setStatus("Det finns ingen registrerad bit att korrigera.", "warn");
      speak("Det finns ingen registrerad bit att korrigera.");
      return false;
    }
    const patch = {};
    if (parsed.dimension) patch.dimension = parsed.dimension;
    if (parsed.lengthCm) patch.lengthCm = parsed.lengthCm;
    if (parsed.note) patch.note = parsed.note;
    if (!Object.keys(patch).length) {
      setStatus("Säg vad som ska korrigeras, till exempel “korrigera längd 430”.", "warn");
      return false;
    }
    const ok = global.SawProductionLog.updateEntry(latest.index, patch);
    if (ok) {
      const updated = latestEntry();
      const entry = updated && updated.entry ? updated.entry : { ...latest.entry, ...patch };
      const cm = lengthCmForEntry(entry) || parsed.lengthCm;
      const message = `Korrigerad: ${entry.dimension}, längd ${cm} cm.`;
      setStatus(message, "ok");
      speak(`Korrigerad ${entry.dimension}, längd ${spokenLength(cm)}.`);
      render();
    }
    return ok;
  }

  function handleVoiceCommand(rawText, options) {
    const normalized = normalizeText(rawText);
    const parsed = parseFreeSawSpeech(rawText);
    const isCorrection = /^(korrigera|andra|ändra)\b/.test(normalized);
    const autoRegister = /^(registrera|spara|sagat|sågat)\b/.test(normalized);
    const explicit = isExplicitFreeSawCommand(rawText);
    const fallback = options && options.fallback;

    if (!parsed) return false;
    if (!explicit && !fallback && !isFreeSawActive()) return false;

    if (isCorrection) return correctLatest(parsed);
    return applyParsedSpeech(parsed, autoRegister);
  }

  function isListening() {
    return !!(global.SawVoiceInput && typeof global.SawVoiceInput.isListening === "function" && global.SawVoiceInput.isListening());
  }

  function updateVoiceButton() {
    const button = $("freeSawVoiceToggle");
    if (!button) return;
    const active = isListening();
    button.textContent = active ? "Stoppa röstinmatning" : "Starta röstinmatning";
    button.classList.toggle("voiceListening", active);
  }

  function startVoice() {
    setStatus("Startar gemensam röstinmatning…", "listening");
    if (global.SawVoiceInput && typeof global.SawVoiceInput.start === "function") global.SawVoiceInput.start();
    else setStatus("Röstinmatningen är inte laddad ännu.", "warn");
    updateVoiceButton();
  }

  function stopVoice() {
    if (global.SawVoiceInput && typeof global.SawVoiceInput.stop === "function") global.SawVoiceInput.stop();
    updateVoiceButton();
  }

  function toggleVoice() {
    if (global.SawVoiceInput && typeof global.SawVoiceInput.toggle === "function") global.SawVoiceInput.toggle();
    else startVoice();
    updateVoiceButton();
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
      const cm = $("freeSawLatestLength").value;
      global.SawProductionLog.updateEntry(index, {
        dimension: $("freeSawLatestDimension").value,
        lengthCm: cm,
        note: $("freeSawLatestNote").value,
      });
      speak(`Sparad ändring, längd ${spokenLength(cm)}.`);
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
    updateVoiceButton();
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
      speak(`Registrerad ${dimension}, längd ${spokenLength(lengthCm)}.`);
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
    global.addEventListener("sawapp:voice-state", updateVoiceButton);
    updateVoiceButton();
    render();
  }

  global.SawFreeSaw = {
    install,
    render,
    addFromForm,
    correctLatest,
    handleVoiceCommand,
    parseFreeSawSpeech,
    startVoice,
    stopVoice,
    toggleVoice,
    isListening,
    syncVoiceButton: updateVoiceButton,
  };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
