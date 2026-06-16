// fix-v42.js
// Förstärker röstflödet utan att röra den äldre röstmodulen:
// - egen robustare SpeechRecognition-loop
// - tydlig diagnostik: hört/matchat
// - headset/media-knapp kopplas till den nya loopen
// - kommando: "sågad/sågar 30 x 150 vildmark längd 4,20"

(function installEnhancedVoiceFlow(global) {
  const STORAGE_KEY = "sawapp.production.v1";
  let recognition = null;
  let listening = false;
  let lastToggleAt = 0;

  function $(id) {
    return global.document.getElementById(id);
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[,]/g, ".")
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/gånger|ganger|kryss|x|\*/g, " x ")
      .replace(/millimeter|millimetrar|mm/g, " millimeter ")
      .replace(/centimeter|centimetrar|cm/g, " centimeter ")
      .replace(/meter|metrar|m/g, " meter ")
      .replace(/[;:!?]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function numberTokens(text) {
    return [...String(text || "").matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  }

  function formatLengthClass(mm) {
    const metres = Math.max(0, Number(mm) || 0) / 1000;
    const flooredHalfMetre = Math.floor(metres * 2) / 2;
    return `${flooredHalfMetre.toFixed(1).replace(".", ",")} m`;
  }

  function currentStockLengthMm() {
    const input = $("logLength");
    const value = input ? Number(input.value) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function lengthFromCommand(text) {
    const lengthIndex = text.search(/\b(langd|stocklangd)\b/);
    if (lengthIndex < 0) return currentStockLengthMm();
    const after = text.slice(lengthIndex);
    const nums = numberTokens(after);
    if (!nums.length) return currentStockLengthMm();
    const value = nums[0];
    if (/\bmillimeter\b/.test(after)) return Math.round(value);
    if (/\bcentimeter\b/.test(after)) return Math.round(value * 10);
    if (/\bmeter\b/.test(after) || value <= 20) return Math.round(value * 1000);
    if (value <= 1000) return Math.round(value * 10);
    return Math.round(value);
  }

  function parseManualSawnCommand(rawText) {
    const text = normalize(rawText);
    if (!/\b(sagad|sagar|sagat)\b/.test(text)) return null;
    const beforeLength = text.split(/\b(langd|stocklangd)\b/)[0];
    const nums = numberTokens(beforeLength);
    if (nums.length < 2) {
      return { ok: false, type: "manual-sawn", text, reason: "Säg t.ex. 'sågad 30 x 150 vildmark'." };
    }

    const thickness = Math.round(nums[0]);
    const width = Math.round(nums[1]);
    if (thickness <= 0 || width <= 0) {
      return { ok: false, type: "manual-sawn", text, reason: "Kunde inte tolka dimensionen." };
    }

    const wildEdge = /\b(vildmark|rakant|rakant|rakanter|raw|r)\b/.test(text);
    const lengthMm = lengthFromCommand(text);
    const dimension = `${thickness}×${width}${wildEdge ? " R" : ""}`;

    return {
      ok: true,
      type: "manual-sawn",
      text,
      product: {
        dimension,
        lengthClass: formatLengthClass(lengthMm),
        usableLengthMm: Math.round(lengthMm),
        productKind: "manual",
        wildEdge,
        addedByVoice: true,
      },
      label: `${dimension}, ${formatLengthClass(lengthMm)}`,
    };
  }

  function readEntries() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeEntries(entries) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (error) {
      return false;
    }
  }

  function addManualProduct(product) {
    if (!product) return false;
    const entries = readEntries();
    entries.push({ ...product, addedAt: new Date().toISOString() });
    if (!writeEntries(entries)) return false;
    if (global.SawProductionLog && typeof global.SawProductionLog.render === "function") global.SawProductionLog.render();
    if (typeof global.update === "function") global.update();
    return true;
  }

  function ensureDiagnostics() {
    const panel = $("voiceInputPanel");
    if (!panel || $("voiceDiagnostics")) return;
    const box = global.document.createElement("div");
    box.id = "voiceDiagnostics";
    box.className = "voiceDiagnostics";
    box.innerHTML = `
      <div><strong>Hörde:</strong> <span id="voiceHeard">–</span></div>
      <div><strong>Matchade:</strong> <span id="voiceMatched">–</span></div>
    `;
    panel.appendChild(box);
  }

  function setDiagnostics(heard, matched) {
    ensureDiagnostics();
    const h = $("voiceHeard");
    const m = $("voiceMatched");
    if (h) h.textContent = heard || "–";
    if (m) m.textContent = matched || "–";
  }

  function setStatus(message, kind) {
    const el = $("voiceInputStatus");
    if (el) {
      el.textContent = message;
      el.className = `voiceStatus ${kind || ""}`.trim();
    }
  }

  function speakKey(key) {
    if (global.SawVoiceSpeechFeedback && typeof global.SawVoiceSpeechFeedback.speakKey === "function") {
      global.SawVoiceSpeechFeedback.speakKey(key);
    }
  }

  function speakText(text) {
    if (global.SawVoiceSpeechFeedback && typeof global.SawVoiceSpeechFeedback.speak === "function") {
      global.SawVoiceSpeechFeedback.speak(text);
    }
  }

  function applyEnhancedCommand(rawText) {
    const manual = parseManualSawnCommand(rawText);
    if (manual) {
      if (!manual.ok) {
        setDiagnostics(rawText, manual.reason);
        setStatus(`Jag hörde: “${rawText}”. ${manual.reason}`, "warn");
        speakKey("parseError");
        return false;
      }
      const ok = addManualProduct(manual.product);
      if (ok) {
        setDiagnostics(rawText, `Sågad produkt: ${manual.label}`);
        setStatus(`Sågad och godkänd: ${manual.label}.`, "ok");
        speakText(`Registrerad ${manual.product.dimension}.`);
      } else {
        setDiagnostics(rawText, "Kunde inte spara i produktionsloggen");
        setStatus("Kunde inte spara sågad produkt i produktionsloggen.", "warn");
      }
      return ok;
    }

    if (global.SawVoiceInput && typeof global.SawVoiceInput.applyVoiceCommand === "function") {
      const ok = global.SawVoiceInput.applyVoiceCommand(rawText);
      setDiagnostics(rawText, ok ? "Standardkommando accepterat" : "Inget kommando matchade");
      return ok;
    }
    return false;
  }

  function recognitionCtor() {
    return global.SpeechRecognition || global.webkitSpeechRecognition || null;
  }

  function createRecognition() {
    const Ctor = recognitionCtor();
    if (!Ctor) return null;
    const instance = new Ctor();
    instance.lang = "sv-SE";
    instance.continuous = true;
    instance.interimResults = false;
    instance.maxAlternatives = 5;
    instance.onstart = () => {
      listening = true;
      updateButton();
      setStatus("Lyssnar… Säg t.ex. 'sågad 30 x 150 vildmark längd 4,20'.", "listening");
    };
    instance.onend = () => {
      listening = false;
      updateButton();
    };
    instance.onerror = (event) => {
      listening = false;
      updateButton();
      setDiagnostics("–", `Röstfel: ${event.error || "okänt fel"}`);
      setStatus(`Röstfel: ${event.error || "okänt fel"}.`, "warn");
      speakKey("voiceError");
    };
    instance.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const alternatives = Array.from(result).map((item) => item.transcript);
        const applied = alternatives.some((alternative) => applyEnhancedCommand(alternative));
        if (!applied && alternatives.length) {
          setDiagnostics(alternatives[0], "Inget kommando matchade");
          setStatus(`Jag hörde: “${alternatives[0]}”. Försök t.ex. “sågad 30 x 150 vildmark”.`, "warn");
          speakKey("parseError");
        }
      }
    };
    return instance;
  }

  function start() {
    if (!recognitionCtor()) {
      setStatus("Röstinmatning stöds inte i den här webbläsaren. Prova Chrome eller Edge.", "warn");
      return;
    }
    if (!recognition) recognition = createRecognition();
    if (!recognition || listening) return;
    try { recognition.start(); } catch (error) { setStatus(`Kunde inte starta röstinmatning: ${error.message}`, "warn"); }
  }

  function stop() {
    if (recognition && listening) recognition.stop();
  }

  function toggle() {
    if (listening) stop();
    else start();
  }

  function updateButton() {
    const button = $("voiceInputToggle");
    if (!button) return;
    button.textContent = listening ? "Stoppa röstinmatning" : "Starta röstinmatning";
    button.classList.toggle("voiceListening", listening);
  }

  function mediaToggle(event) {
    const now = Date.now();
    if (event && event.repeat && now - lastToggleAt < 700) return;
    if (now - lastToggleAt < 450) return;
    lastToggleAt = now;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    }
    toggle();
  }

  function installMediaHandlers() {
    global.addEventListener("keydown", (event) => {
      if (event.key === "MediaPlayPause" || event.code === "MediaPlayPause" || event.keyCode === 179 || event.which === 179) mediaToggle(event);
    }, true);
    global.addEventListener("keyup", (event) => {
      if (event.key === "MediaPlayPause" || event.code === "MediaPlayPause" || event.keyCode === 179 || event.which === 179) mediaToggle(event);
    }, true);

    if (global.navigator && global.navigator.mediaSession && typeof global.navigator.mediaSession.setActionHandler === "function") {
      ["play", "pause", "nexttrack", "previoustrack", "stop"].forEach((action) => {
        try { global.navigator.mediaSession.setActionHandler(action, () => mediaToggle()); } catch (error) {}
      });
    }
  }

  function installButton() {
    const button = $("voiceInputToggle");
    if (!button || button.dataset.enhancedVoice === "true") return;
    button.dataset.enhancedVoice = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      toggle();
    }, true);
  }

  function install() {
    ensureDiagnostics();
    installButton();
    installMediaHandlers();
    updateButton();
    global.SawEnhancedVoiceFlow = { start, stop, toggle, parseManualSawnCommand, addManualProduct };
  }

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
