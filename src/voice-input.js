// src/voice-input.js
// Röstinmatning för stockmått och sågflöde.

(function initSawVoiceInput(global) {
  const FIELD_ALIASES = [
    { field: "rootDiameter", label: "Diameter stöd 1", patterns: [/stod\s*(ett|en|1)/i, /stodett/i, /stoden/i, /diameter\s*stod\s*(ett|en|1)/i] },
    { field: "topDiameter", label: "Diameter stöd 2", patterns: [/stod\s*(tva|två|2)/i, /stodtva/i, /stodtvo/i, /diameter\s*stod\s*(tva|två|2)/i] },
    { field: "rootEndDiameter", label: "Rotända", patterns: [/rot(anda)?/i, /rot\s*ande/i] },
    { field: "topEndDiameter", label: "Toppända", patterns: [/topp(anda)?/i, /topp\s*ande/i] },
    { field: "logLength", label: "Stocklängd", patterns: [/langd/i, /stocklangd/i, /stock\s*langd/i] },
    { field: "sweep", label: "Krokighet", patterns: [/krokighet/i, /krok/i, /snoravvikelse/i, /avvikelse/i] },
    { field: "bark", label: "Bark", patterns: [/bark/i, /barktjocklek/i] },
  ];

  const VOICE_DEFAULT_CM_FIELDS = new Set(["rootDiameter", "topDiameter", "rootEndDiameter", "topEndDiameter", "logLength", "sweep", "bark"]);
  const MEASURED_LOG_FIELDS = ["rootDiameter", "topDiameter", "rootEndDiameter", "topEndDiameter", "logLength", "sweep"];

  const NUMBER_WORDS = new Map([
    ["noll", 0], ["en", 1], ["ett", 1], ["tva", 2], ["två", 2], ["tre", 3], ["fyra", 4], ["fem", 5],
    ["sex", 6], ["sju", 7], ["atta", 8], ["åtta", 8], ["nio", 9], ["tio", 10], ["elva", 11], ["tolv", 12],
    ["tretton", 13], ["fjorton", 14], ["femton", 15], ["sexton", 16], ["sjutton", 17], ["arton", 18],
    ["nitton", 19], ["tjugo", 20], ["trettio", 30], ["fyrtio", 40], ["femtio", 50], ["sextio", 60],
    ["sjuttio", 70], ["attio", 80], ["åttio", 80], ["nittio", 90], ["hundra", 100], ["tusen", 1000],
  ]);

  const MAGNITUDE_WORDS = new Set(["hundra", "tusen"]);
  const COMMAND_WORDS = new Set([
    "stod", "stodett", "stoden", "stodtva", "stodtvo", "diameter", "rot", "rotanda", "rotande",
    "topp", "toppanda", "toppande", "langd", "stocklangd", "stock", "krokighet", "krok",
    "snoravvikelse", "avvikelse", "bark", "barktjocklek", "centimeter", "millimeter",
  ]);

  let recognition = null;
  let listening = false;
  let lastField = null;
  let audioContext = null;
  let voiceInstalled = false;
  let mediaKeyInstalled = false;
  let lastMediaToggleAt = 0;

  function recognitionCtor() {
    return global.SpeechRecognition || global.webkitSpeechRecognition || null;
  }

  function supportsSpeechRecognition() {
    return !!recognitionCtor();
  }

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/,/g, ".")
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/millimeter|millimetrar|mm/g, " millimeter ")
      .replace(/centimeter|centimetrar|cm/g, " centimeter ")
      .replace(/[.!?:;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseNumberToken(token) {
    const normalized = normalizeText(token).replace(",", ".");
    if (/^-?\d+(\.\d+)?$/.test(normalized)) return Number(normalized);
    return NUMBER_WORDS.has(normalized) ? NUMBER_WORDS.get(normalized) : null;
  }

  function tokensAfterField(text, fieldId) {
    const words = text.split(/\s+/).filter(Boolean);
    const fieldIndex = words.findIndex((word, index) => {
      if (fieldId === "logLength") return /^(langd|stocklangd)$/.test(word) || (word === "stock" && words[index + 1] === "langd");
      if (fieldId === "rootDiameter") return /^stod(ett|en|1)?$/.test(word) || (word === "stod" && /^(ett|en|1)$/.test(words[index + 1] || ""));
      if (fieldId === "topDiameter") return /^stod(tva|2|tvo)?$/.test(word) || (word === "stod" && /^(tva|2|tvo)$/.test(words[index + 1] || ""));
      if (fieldId === "rootEndDiameter") return /^rot/.test(word);
      if (fieldId === "topEndDiameter") return /^topp/.test(word);
      if (fieldId === "sweep") return /^(krokighet|krok|snoravvikelse|avvikelse)$/.test(word);
      if (fieldId === "bark") return /^(bark|barktjocklek)$/.test(word);
      return false;
    });

    const rawTokens = fieldIndex >= 0 ? words.slice(fieldIndex + 1) : words;
    return rawTokens.filter((word) => !COMMAND_WORDS.has(word));
  }

  function parseSwedishNumberWords(tokens) {
    let total = 0;
    let current = 0;
    let found = false;

    for (const token of tokens) {
      const value = parseNumberToken(token);
      if (value === null) continue;
      found = true;
      if (token === "hundra") current = (current || 1) * 100;
      else if (token === "tusen") {
        total += (current || 1) * 1000;
        current = 0;
      } else current += value;
    }

    return found ? total + current : null;
  }

  function parseSpokenNumberTokens(tokens) {
    const values = tokens.map(parseNumberToken).filter((value) => value !== null && !Number.isNaN(value));
    if (!values.length) return null;
    if (values.length >= 2 && values[0] >= 1 && values[0] <= 9 && values[1] >= 0 && values[1] < 100) return values[0] * 100 + values[1];
    return values.length === 1 ? values[0] : values[values.length - 1];
  }

  function extractNumber(text, fieldId) {
    const digitMatches = [...text.matchAll(/-?\d+(?:[\.,]\d+)?/g)].map((match) => Number(match[0].replace(",", ".")));

    if (fieldId === "logLength") {
      const relevantTokens = tokensAfterField(text, fieldId);
      const spoken = parseSpokenNumberTokens(relevantTokens);
      const wordNumber = parseSwedishNumberWords(relevantTokens);
      if (relevantTokens.some((token) => MAGNITUDE_WORDS.has(token)) && wordNumber !== null) return wordNumber;
      if (digitMatches.length >= 2 && digitMatches[0] >= 1 && digitMatches[0] <= 9 && digitMatches[1] >= 0 && digitMatches[1] < 100) return digitMatches[0] * 100 + digitMatches[1];
      if (spoken !== null) return spoken;
      return digitMatches.length ? digitMatches[digitMatches.length - 1] : null;
    }

    if (digitMatches.length) return digitMatches[digitMatches.length - 1];

    const words = text.split(/\s+/);
    for (let i = words.length - 1; i >= 0; i -= 1) {
      const value = parseNumberToken(words[i]);
      if (value !== null) return value;
    }
    return null;
  }

  function findField(text) {
    return FIELD_ALIASES.find((alias) => alias.patterns.some((pattern) => pattern.test(text))) || null;
  }

  function hasMillimeterUnit(text) {
    return /\bmillimeter\b/.test(text);
  }

  function hasCentimeterUnit(text) {
    return /\bcentimeter\b/.test(text);
  }

  function measurementToMillimeters(fieldId, value, text) {
    if (hasMillimeterUnit(text)) return { valueMm: value, sourceUnit: "mm", sourceValue: value };
    if (hasCentimeterUnit(text) || VOICE_DEFAULT_CM_FIELDS.has(fieldId)) return { valueMm: value * 10, sourceUnit: "cm", sourceValue: value };
    return { valueMm: value, sourceUnit: "mm", sourceValue: value };
  }

  function isDoneCommand(text) {
    return /^(klar|fardig|stock\s*klar|matning\s*klar)$/i.test(text.trim());
  }

  function isNextCutCommand(text) {
    return /^(nasta\s*(snitt|steg)|framat|nasta)$/i.test(text.trim());
  }

  function isPreviousCutCommand(text) {
    return /^(foregaende\s*(snitt|steg)|forra\s*(snitt|steg)|bakat|tillbaka)$/i.test(text.trim());
  }

  function isNewLogCommand(text) {
    return /^(ny\s*stock|nasta\s*stock|ny\s*matning)$/i.test(text.trim());
  }

  function getInput(id) {
    return global.document.getElementById(id);
  }

  function ensureAudioContext() {
    const AudioContextCtor = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!audioContext) audioContext = new AudioContextCtor();
    if (audioContext.state === "suspended" && typeof audioContext.resume === "function") audioContext.resume().catch(() => {});
    return audioContext;
  }

  function playConfirmSound() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (error) {}
  }

  function setFieldValue(fieldId, value) {
    const input = getInput(fieldId);
    if (!input) return false;
    input.value = String(Math.round(value));
    input.dispatchEvent(new global.Event("input", { bubbles: true }));
    input.dispatchEvent(new global.Event("change", { bubbles: true }));
    return true;
  }

  function resetMeasuredLogFields() {
    for (const fieldId of MEASURED_LOG_FIELDS) {
      const input = getInput(fieldId);
      if (input) input.value = "";
    }
  }

  function buildCurrentContext() {
    if (global.SawUpdatePipeline && typeof global.SawUpdatePipeline.buildPlanContext === "function") return global.SawUpdatePipeline.buildPlanContext();
    return null;
  }

  function activateWorkScreen() {
    if (global.SawWorkScreen && typeof global.SawWorkScreen.activateWorkScreen === "function") {
      global.SawWorkScreen.activateWorkScreen();
      return true;
    }
    const tabButton = global.document.querySelector('.tab[data-tab="bigTab"]');
    if (tabButton) tabButton.click();
    return true;
  }

  function describeStep(context) {
    if (!context || !context.step) return "Inget aktivt snitt hittades.";
    const step = context.step;
    const index = (context.stepIndex || 0) + 1;
    const total = context.activePlanLength || "?";
    const support1 = Number.isFinite(step.rootSupportHeight) ? `${step.rootSupportHeight.toFixed(0)} mm` : "–";
    const support2 = Number.isFinite(step.topSupportHeight) ? `${step.topSupportHeight.toFixed(0)} mm` : "–";
    return `Snitt ${index} av ${total}: rotation ${step.rotation || "–"}. Stöd 1 ${support1}, stöd 2 ${support2}.`;
  }

  function parseVoiceCommand(rawText) {
    const text = normalizeText(rawText);
    if (!text) return null;
    if (isDoneCommand(text)) return { ok: true, type: "done", text };
    if (isNextCutCommand(text)) return { ok: true, type: "next-cut", text };
    if (isPreviousCutCommand(text)) return { ok: true, type: "previous-cut", text };
    if (isNewLogCommand(text)) return { ok: true, type: "new-log", text };

    let field = findField(text);
    const number = field ? extractNumber(text, field.field) : extractNumber(text, lastField);
    if (!field && lastField && number !== null && /^(\d|noll|en|ett|tva|tre|fyra|fem|sex|sju|atta|nio|tio)/.test(text)) field = FIELD_ALIASES.find((item) => item.field === lastField) || null;
    if (!field || number === null || Number.isNaN(number)) return { ok: false, text, reason: "Kunde inte hitta både fält och värde." };

    const measurement = measurementToMillimeters(field.field, number, text);
    return { ok: true, type: "field", text, field: field.field, label: field.label, value: measurement.valueMm, sourceValue: measurement.sourceValue, sourceUnit: measurement.sourceUnit };
  }

  function setStatus(message, kind) {
    const el = getInput("voiceInputStatus");
    if (!el) return;
    el.textContent = message;
    el.className = `voiceStatus ${kind || ""}`.trim();
  }

  function handleDoneCommand() {
    lastField = null;
    if (global.SawState && typeof global.SawState.resetCurrentStepIndex === "function") global.SawState.resetCurrentStepIndex();
    if (typeof global.update === "function") global.update();
    activateWorkScreen();
    playConfirmSound();
    setStatus(`Klar. Sågplanen är beräknad. ${describeStep(buildCurrentContext())} Säg “nästa snitt” för att gå vidare.`, "ok");
    return true;
  }

  function handleMoveCut(delta) {
    const before = buildCurrentContext();
    if (!before || !before.activePlanLength) {
      setStatus("Ingen sågplan finns ännu. Mät stöd 1, stöd 2 och längd först.", "warn");
      return false;
    }
    const currentIndex = Number(before.stepIndex || 0);
    const lastIndex = Number(before.activePlanLength || 1) - 1;
    const nextIndex = Math.max(0, Math.min(lastIndex, currentIndex + Number(delta || 0)));
    if (nextIndex === currentIndex) {
      activateWorkScreen();
      playConfirmSound();
      setStatus(delta > 0 ? "Sista snittet. Säg “ny stock” när du börjar med nästa stock." : "Första snittet.", "ok");
      return true;
    }
    if (global.SawState && typeof global.SawState.setCurrentStepIndex === "function") global.SawState.setCurrentStepIndex(nextIndex);
    if (typeof global.update === "function") global.update();
    activateWorkScreen();
    playConfirmSound();
    setStatus(describeStep(buildCurrentContext()), "ok");
    return true;
  }

  function handleNewLogCommand() {
    lastField = null;
    resetMeasuredLogFields();
    if (global.SawState && typeof global.SawState.resetCurrentStepIndex === "function") global.SawState.resetCurrentStepIndex();
    if (typeof global.update === "function") global.update();
    activateWorkScreen();
    playConfirmSound();
    setStatus("Ny stock. Ange nya värden, t.ex. “stöd1 32”, “stöd2 30” och “längd fyra sextio”.", "listening");
    return true;
  }

  function applyVoiceCommand(rawText) {
    const parsed = parseVoiceCommand(rawText);
    if (!parsed || !parsed.ok) {
      setStatus(`Jag hörde: “${rawText}”. Tolkade som: “${parsed ? parsed.text : ""}”. ${parsed ? parsed.reason : "Kunde inte tolka kommandot."}`, "warn");
      return false;
    }
    if (parsed.type === "done") return handleDoneCommand();
    if (parsed.type === "next-cut") return handleMoveCut(1);
    if (parsed.type === "previous-cut") return handleMoveCut(-1);
    if (parsed.type === "new-log") return handleNewLogCommand();
    if (!setFieldValue(parsed.field, parsed.value)) {
      setStatus(`Kunde inte sätta ${parsed.label}.`, "warn");
      return false;
    }
    lastField = parsed.field;
    if (global.SawWorkScreen && typeof global.SawWorkScreen.hasMinimumLogInput === "function" && global.SawWorkScreen.hasMinimumLogInput()) activateWorkScreen();
    playConfirmSound();
    setStatus(`${parsed.label}: ${parsed.sourceValue} ${parsed.sourceUnit} (${Math.round(parsed.value)} mm)`, "ok");
    return true;
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
      updateButtonState();
      ensureAudioContext();
      setStatus("Lyssnar… säg mått i centimeter, “nästa snitt” eller “ny stock”.", "listening");
    };
    instance.onend = () => {
      listening = false;
      updateButtonState();
    };
    instance.onerror = (event) => {
      listening = false;
      updateButtonState();
      setStatus(`Röstfel: ${event.error || "okänt fel"}.`, "warn");
    };
    instance.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const alternatives = Array.from(result).map((item) => item.transcript);
        const applied = alternatives.some((alternative) => applyVoiceCommand(alternative));
        if (!applied && alternatives.length) setStatus(`Jag hörde: “${alternatives[0]}”. Säg t.ex. “stöd2 30”, “längd fyra sextio”, “nästa snitt” eller “ny stock”.`, "warn");
      }
    };
    return instance;
  }

  function startListening() {
    if (!supportsSpeechRecognition()) {
      setStatus("Röstinmatning stöds inte i den här webbläsaren. Prova Chrome eller Edge.", "warn");
      return;
    }
    if (!recognition) recognition = createRecognition();
    if (!recognition || listening) return;
    try {
      ensureAudioContext();
      recognition.start();
    } catch (error) {
      setStatus(`Kunde inte starta röstinmatning: ${error.message}`, "warn");
    }
  }

  function stopListening() {
    if (recognition && listening) recognition.stop();
  }

  function toggleListening() {
    if (listening) stopListening();
    else startListening();
  }

  function updateButtonState() {
    const button = getInput("voiceInputToggle");
    if (!button) return;
    button.textContent = listening ? "Stoppa röstinmatning" : "Starta röstinmatning";
    button.classList.toggle("voiceListening", listening);
  }

  function installMediaKeyToggle() {
    if (mediaKeyInstalled) return;
    mediaKeyInstalled = true;

    global.addEventListener("keydown", (event) => {
      if (event.key !== "MediaPlayPause") return;
      const now = Date.now();
      if (event.repeat && now - lastMediaToggleAt < 700) return;
      if (now - lastMediaToggleAt < 450) return;
      lastMediaToggleAt = now;
      event.preventDefault();
      event.stopPropagation();
      toggleListening();
    }, true);
  }

  function installVoiceInput() {
    let panel = getInput("voiceInputPanel");
    if (!panel) {
      const target = global.document.querySelector(".bigDataPanel") || global.document.querySelector("#stockTab .panel");
      if (!target) return;
      panel = global.document.createElement("div");
      panel.id = "voiceInputPanel";
      panel.className = "voicePanel voicePanel-work";
      panel.innerHTML = `
        <div class="toolbar voiceToolbar"><button id="voiceInputToggle" type="button">Starta röstinmatning</button></div>
        <div id="voiceInputStatus" class="voiceStatus">Säg mått i centimeter: “stöd1 32”, “stöd2 30”, “rot 34”, “topp 29”, “längd fyra sextio”. Säg “nästa snitt” och “ny stock”.</div>
      `;
      target.prepend(panel);
    }

    const button = getInput("voiceInputToggle");
    if (button && !voiceInstalled) {
      button.addEventListener("click", toggleListening);
      voiceInstalled = true;
    }
    installMediaKeyToggle();
    if (!supportsSpeechRecognition()) {
      setStatus("Röstinmatning stöds inte i den här webbläsaren. Prova Chrome eller Edge.", "warn");
      if (button) button.disabled = true;
    }
    updateButtonState();
  }

  global.SawVoiceInput = { install: installVoiceInput, start: startListening, stop: stopListening, toggle: toggleListening, parseVoiceCommand, applyVoiceCommand, supportsSpeechRecognition };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", installVoiceInput);
  else installVoiceInput();
})(window);
