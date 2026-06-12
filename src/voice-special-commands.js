// src/voice-special-commands.js
// Fångar specialkommandon före standardtolkningen i voice-input.js.

(function initVoiceSpecialCommands(global) {
  const NativeSpeechRecognition = global.SpeechRecognition || global.webkitSpeechRecognition;
  if (!NativeSpeechRecognition) return;

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/[.!?:;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function setStatus(message, kind) {
    const el = global.document.getElementById("voiceInputStatus");
    if (!el) return;
    el.textContent = message;
    el.className = `voiceStatus ${kind || ""}`.trim();
  }

  function beep() {
    try {
      if (global.SawVoiceFeedback && typeof global.SawVoiceFeedback.playStartSignal === "function") return;
      const Ctor = global.AudioContext || global.webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
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

  function activateWorkScreen() {
    if (global.SawWorkScreen && typeof global.SawWorkScreen.activateWorkScreen === "function") {
      global.SawWorkScreen.activateWorkScreen();
      return;
    }
    const button = global.document.querySelector('.tab[data-tab="bigTab"]');
    if (button) button.click();
  }

  function buildContext() {
    if (global.SawUpdatePipeline && typeof global.SawUpdatePipeline.buildPlanContext === "function") {
      return global.SawUpdatePipeline.buildPlanContext();
    }
    if (typeof global.buildPlanContext === "function") return global.buildPlanContext();
    return null;
  }

  function describeStep(context) {
    if (!context || !context.step) return "Ingen sågplan finns ännu.";
    const step = context.step;
    const index = (context.stepIndex || 0) + 1;
    const total = context.activePlanLength || "?";
    const support1 = Number.isFinite(step.rootSupportHeight) ? `${step.rootSupportHeight.toFixed(0)} mm` : "–";
    const support2 = Number.isFinite(step.topSupportHeight) ? `${step.topSupportHeight.toFixed(0)} mm` : "–";
    return `Snitt ${index} av ${total}: rotation ${step.rotation || "–"}. Stöd 1 ${support1}, stöd 2 ${support2}.`;
  }

  function normalizeRotation(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return ((Math.round(n) % 360) + 360) % 360;
  }

  function findStepIndexByRotation(context, targetRotation) {
    const plan = context && Array.isArray(context.activePlan) ? context.activePlan : [];
    if (!plan.length) return -1;
    const target = normalizeRotation(targetRotation);
    const current = Number(context.stepIndex || 0);
    for (let offset = 0; offset < plan.length; offset += 1) {
      const index = (current + offset) % plan.length;
      const stepRotation = normalizeRotation(plan[index] && plan[index].rotation);
      if (stepRotation === target) return index;
    }
    return -1;
  }

  function parseRotationCommand(text) {
    if (!/^rotera\b|^(hoger|vanster)\b/.test(text)) return null;
    const match = text.match(/\b(0|90|180|270)\b/);
    if (!match) return null;
    const angle = Number(match[1]);
    const direction = /\bhoger\b/.test(text) ? "right" : (/\bvanster\b/.test(text) ? "left" : null);
    return { angle, direction, relative: !!direction };
  }

  function handleSupportReadout() {
    const context = buildContext();
    activateWorkScreen();
    beep();
    setStatus(describeStep(context), context && context.step ? "ok" : "warn");
    return true;
  }

  function handleRotate(command) {
    const context = buildContext();
    if (!context || !context.activePlanLength || !context.step) {
      setStatus("Ingen sågplan finns ännu. Mät stöd 1, stöd 2 och längd först.", "warn");
      return true;
    }
    const currentRotation = normalizeRotation(context.step.rotation) || 0;
    const targetRotation = command.relative
      ? normalizeRotation(currentRotation + (command.direction === "left" ? -command.angle : command.angle))
      : normalizeRotation(command.angle);
    const targetIndex = findStepIndexByRotation(context, targetRotation);
    if (targetIndex < 0) {
      setStatus(`Hittar inget planerat snitt med rotation ${targetRotation} grader.`, "warn");
      return true;
    }
    if (global.SawState && typeof global.SawState.setCurrentStepIndex === "function") {
      global.SawState.setCurrentStepIndex(targetIndex);
    }
    if (typeof global.update === "function") global.update();
    activateWorkScreen();
    beep();
    setStatus(`Roterat till ${targetRotation} grader. ${describeStep(buildContext())}`, "ok");
    return true;
  }

  function handleText(rawText) {
    const text = normalizeText(rawText);
    if (/^(hojd|vilken hojd|stod|stodhojd|hojdinstallning|installning|las hojd|visa hojd)$/.test(text)) {
      return handleSupportReadout();
    }
    const rotation = parseRotationCommand(text);
    if (rotation) return handleRotate(rotation);
    return false;
  }

  function wrapResultHandler(handler) {
    return function wrappedSpeechResult(event) {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result || !result.isFinal) continue;
        const alternatives = Array.from(result).map((item) => item.transcript);
        if (alternatives.some(handleText)) return;
      }
      return handler.call(this, event);
    };
  }

  function WrappedSpeechRecognition() {
    const instance = new NativeSpeechRecognition();
    let onresultHandler = null;
    Object.defineProperty(instance, "onresult", {
      configurable: true,
      enumerable: true,
      get() {
        return onresultHandler;
      },
      set(handler) {
        onresultHandler = typeof handler === "function" ? wrapResultHandler(handler) : handler;
      },
    });
    return instance;
  }

  WrappedSpeechRecognition.prototype = NativeSpeechRecognition.prototype;
  global.SpeechRecognition = WrappedSpeechRecognition;
  global.webkitSpeechRecognition = WrappedSpeechRecognition;
  global.SawVoiceSpecialCommands = { handleText };
})(window);
