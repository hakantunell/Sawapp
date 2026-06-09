// src/voice-input.js
// Första version av röstinmatning för stockmått och sågflöde.

(function initSawVoiceInput(global) {
  const FIELD_ALIASES = [
    { field: "rootDiameter", label: "Diameter stöd 1", patterns: [/stöd\s*(ett|1)/i, /stödett/i, /diameter\s*stöd\s*(ett|1)/i] },
    { field: "topDiameter", label: "Diameter stöd 2", patterns: [/stöd\s*(två|2)/i, /stödtvå/i, /diameter\s*stöd\s*(två|2)/i] },
    { field: "rootEndDiameter", label: "Rotända", patterns: [/rot(ända)?/i, /rot\s*ände/i] },
    { field: "topEndDiameter", label: "Toppända", patterns: [/topp(ända)?/i, /topp\s*ände/i] },
    { field: "logLength", label: "Stocklängd", patterns: [/längd/i, /stocklängd/i, /stock\s*längd/i] },
    { field: "sweep", label: "Krokighet", patterns: [/krokighet/i, /krok/i, /snöravvikelse/i, /avvikelse/i] },
    { field: "bark", label: "Bark", patterns: [/bark/i, /barktjocklek/i] },
  ];

  const NUMBER_WORDS = new Map([
    ["noll", 0], ["en", 1], ["ett", 1], ["två", 2], ["tre", 3], ["fyra", 4], ["fem", 5],
    ["sex", 6], ["sju", 7], ["åtta", 8], ["nio", 9], ["tio", 10], ["elva", 11], ["tolv", 12],
    ["tretton", 13], ["fjorton", 14], ["femton", 15], ["sexton", 16], ["sjutton", 17],
    ["arton", 18], ["nitton", 19], ["tjugo", 20], ["trettio", 30], ["fyrtio", 40],
    ["femtio", 50], ["sextio", 60], ["sjuttio", 70], ["åttio", 80], ["nittio", 90],
    ["hundra", 100], ["tusen", 1000],
  ]);

  let recognition = null;
  let listening = false;
  let lastField = null;
  let workflowMode = "measure";

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
      .replace(/millimeter|millimetrar|mm/g, " ")
      .replace(/centimeter|centimetrar|cm/g, " centimeter ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseNumberToken(token) {
    const normalized = String(token || "").toLowerCase().replace(",", ".");
    if (/^-?\d+(\.\d+)?$/.test(normalized)) return Number(normalized);
    if (NUMBER_WORDS.has(normalized)) return NUMBER_WORDS.get(normalized);
    return null;
  }

  function extractNumber(text) {
    const digitMatches = [...text.matchAll(/-?\d+(?:[\.,]\d+)?/g)];
    if (digitMatches.length) {
      // Använd sista talet så att "stöd1 320" inte tolkas som värdet 1.
      return Number(digitMatches[digitMatches.length - 1][0].replace(",", "."));
    }

    const words = text.split(/\s+/);
    for (let i = words.length - 1; i >= 0; i -= 1) {
      const value = parseNumberToken(words[i]);
      if (value !== null) return value;
    }

    return null;
  }

  function findField(text) {
    for (const alias of FIELD_ALIASES) {
      if (alias.patterns.some((pattern) => pattern.test(text))) return alias;
    }

    return null;
  }

  function isDoneCommand(text) {
    return /^(klar|färdig|stock\s*klar|mätning\s*klar)$/i.test(text.trim());
  }

  function isNextCutCommand(text) {
    return /^(nästa\s*(snitt|steg)|framåt|nästa)$/i.test(text.trim());
  }

  function isPreviousCutCommand(text) {
    return /^(föregående\s*(snitt|steg)|förra\s*(snitt|steg)|bakåt|tillbaka)$/i.test(text.trim());
  }

  function isNewLogCommand(text) {
    return /^(ny\s*stock|nästa\s*stock|ny\s*mätning)$/i.test(text.trim());
  }

  function getInput(id) {
    return global.document.getElementById(id);
  }

  function setFieldValue(fieldId, value) {
    const input = getInput(fieldId);
    if (!input) return false;

    input.value = String(Math.round(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function buildCurrentContext() {
    if (global.SawUpdatePipeline && typeof global.SawUpdatePipeline.buildPlanContext === "function") {
      return global.SawUpdatePipeline.buildPlanContext();
    }
    return null;
  }

  function activateTab(tabId) {
    const tabButton = global.document.querySelector(`.tab[data-tab="${tabId}"]`);
    if (tabButton) {
      tabButton.click();
      return true;
    }

    global.document.querySelectorAll(".tabPage").forEach((page) => page.classList.toggle("active", page.id === tabId));
    global.document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabId));
    return false;
  }

  function describeStep(context) {
    if (!context || !context.step) return "Ingen aktivt snitt hittades.";
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
    const number = extractNumber(text);

    if (!field && lastField && number !== null && /^(\d|noll|en|ett|två|tre|fyra|fem|sex|sju|åtta|nio|tio)/.test(text)) {
      field = FIELD_ALIASES.find((item) => item.field === lastField) || null;
    }

    if (!field || number === null || Number.isNaN(number)) {
      return { ok: false, text, reason: "Kunde inte hitta både fält och värde." };
    }

    return { ok: true, type: "field", text, field: field.field, label: field.label, value: number };
  }

  function setStatus(message, kind) {
    const el = getInput("voiceInputStatus");
    if (!el) return;
    el.textContent = message;
    el.className = `voiceStatus ${kind || ""}`.trim();
  }

  function handleDoneCommand() {
    lastField = null;
    workflowMode = "cut";
    if (global.SawState && typeof global.SawState.resetCurrentStepIndex === "function") {
      global.SawState.resetCurrentStepIndex();
    }
    if (typeof global.update === "function") global.update();
    activateTab("planTab");
    setStatus(`Klar. Sågplanen är beräknad. ${describeStep(buildCurrentContext())} Säg “nästa snitt” för att gå vidare.`, "ok");
    return true;
  }

  function handleMoveCut(delta) {
    const before = buildCurrentContext();
    if (!before || !before.activePlanLength) {
      setStatus("Ingen sågplan finns ännu. Mät stocken och säg “klar” först.", "warn");
      return false;
    }

    workflowMode = "cut";
    if (global.SawState && typeof global.SawState.moveCurrentStep === "function") {
      global.SawState.moveCurrentStep(delta, before.activePlanLength);
    }
    if (typeof global.update === "function") global.update();
    activateTab("planTab");
    setStatus(describeStep(buildCurrentContext()), "ok");
    return true;
  }

  function handleNewLogCommand() {
    workflowMode = "measure";
    lastField = null;
    if (global.SawState && typeof global.SawState.resetCurrentStepIndex === "function") {
      global.SawState.resetCurrentStepIndex();
    }
    if (typeof global.update === "function") global.update();
    activateTab("stockTab");
    setStatus("Ny stock. Ange nya värden, t.ex. “stöd1 320” och “stöd2 300”. Säg “klar” när stocken är färdigmätt.", "listening");
    return true;
  }

  function applyVoiceCommand(rawText) {
    const parsed = parseVoiceCommand(rawText);
    if (!parsed || !parsed.ok) {
      setStatus(`Jag hörde: “${rawText}”. ${parsed ? parsed.reason : "Kunde inte tolka kommandot."}`, "warn");
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

    workflowMode = "measure";
    lastField = parsed.field;
    setStatus(`${parsed.label}: ${Math.round(parsed.value)} mm`, "ok");
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
      setStatus("Lyssnar… säg mått, “klar”, “nästa snitt” eller “ny stock”.", "listening");
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
        if (!applied && alternatives.length) {
          setStatus(`Jag hörde: “${alternatives[0]}”. Säg t.ex. “stöd2 300”, “klar”, “nästa snitt” eller “ny stock”.`, "warn");
        }
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

  function installVoiceInput() {
    const stockPanel = global.document.querySelector("#stockTab .panel");
    if (!stockPanel || getInput("voiceInputPanel")) return;

    const panel = global.document.createElement("div");
    panel.id = "voiceInputPanel";
    panel.className = "voicePanel";
    panel.innerHTML = `
      <div class="toolbar voiceToolbar">
        <button id="voiceInputToggle" type="button">Starta röstinmatning</button>
      </div>
      <div id="voiceInputStatus" class="voiceStatus">Säg mått som “stöd1 320”, “stöd2 300”, “rot 340”, “topp 290”. Säg “klar” när stocken är färdigmätt, “nästa snitt” i sågplanen och “ny stock” för nästa mätning.</div>
    `;

    const hint = stockPanel.querySelector(".hint");
    if (hint && hint.nextSibling) stockPanel.insertBefore(panel, hint.nextSibling);
    else stockPanel.appendChild(panel);

    const button = getInput("voiceInputToggle");
    if (button) button.addEventListener("click", toggleListening);

    if (!supportsSpeechRecognition()) {
      setStatus("Röstinmatning stöds inte i den här webbläsaren. Prova Chrome eller Edge.", "warn");
      if (button) button.disabled = true;
    }

    updateButtonState();
  }

  global.SawVoiceInput = {
    install: installVoiceInput,
    start: startListening,
    stop: stopListening,
    toggle: toggleListening,
    parseVoiceCommand,
    applyVoiceCommand,
    supportsSpeechRecognition,
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", installVoiceInput);
  } else {
    installVoiceInput();
  }
})(window);
