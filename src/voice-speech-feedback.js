// src/voice-speech-feedback.js
// Kort talsyntes-feedback för röstinmatning i sågskärmen.

(function initSawVoiceSpeechFeedback(global) {
  const STORAGE_KEY = "sawapp.voiceSpeechFeedback.enabled";
  let lastSpokenKey = "";
  let lastSpokenAt = 0;
  let observer = null;

  function supportsSpeech() {
    return !!global.speechSynthesis && !!global.SpeechSynthesisUtterance;
  }

  function isEnabled() {
    try {
      return global.localStorage.getItem(STORAGE_KEY) !== "false";
    } catch (error) {
      return true;
    }
  }

  function setEnabled(value) {
    try {
      global.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    } catch (error) {}
    updateToggle();
  }

  function pickVoice() {
    if (!supportsSpeech()) return null;
    const voices = global.speechSynthesis.getVoices ? global.speechSynthesis.getVoices() : [];
    return voices.find((voice) => /^sv/i.test(voice.lang || "")) || voices.find((voice) => /^en/i.test(voice.lang || "")) || voices[0] || null;
  }

  function speak(text, options) {
    if (!supportsSpeech() || !isEnabled() || !text) return false;

    const now = Date.now();
    const key = String(text);
    if (key === lastSpokenKey && now - lastSpokenAt < 1200) return false;
    lastSpokenKey = key;
    lastSpokenAt = now;

    try {
      global.speechSynthesis.cancel();
      const utterance = new global.SpeechSynthesisUtterance(key);
      utterance.lang = "sv-SE";
      utterance.rate = options && options.rate ? options.rate : 1.05;
      utterance.pitch = options && options.pitch ? options.pitch : 1;
      utterance.volume = options && options.volume ? options.volume : 1;
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      global.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      return false;
    }
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/\s+/g, " ")
      .trim();
  }

  function spokenMessageForStatus(statusText) {
    const text = normalize(statusText);
    if (!text) return null;

    if (/ny stock/.test(text)) return "Påbörja ny stock.";
    if (/diameter stod 1|stod 1/.test(text) && /\d/.test(text)) return "Värde stöd ett registrerat.";
    if (/diameter stod 2|stod 2/.test(text) && /\d/.test(text)) return "Värde stöd två registrerat.";
    if (/rotanda|rotande/.test(text) && /\d/.test(text)) return "Rotända registrerad.";
    if (/toppanda|toppande/.test(text) && /\d/.test(text)) return "Toppända registrerad.";
    if (/stocklangd|langd/.test(text) && /\d/.test(text)) return "Längd registrerad.";
    if (/krokighet|krok/.test(text) && /\d/.test(text)) return "Krokighet registrerad.";
    if (/bark/.test(text) && /\d/.test(text)) return "Barktjocklek registrerad.";
    if (/klar\. sagplanen ar beraknad/.test(text)) return "Sågplan beräknad.";
    if (/godkand/.test(text)) return "Godkänd.";
    if (/kasserad/.test(text)) return "Kasserad.";
    if (/ingen fardig bit att godkanna/.test(text)) return "Ingen färdig bit att godkänna.";
    if (/ingen fardig bit att kassera/.test(text)) return "Ingen färdig bit att kassera.";
    if (/rostfel/.test(text)) return "Röstfel.";
    if (/kunde inte hitta bade falt och varde/.test(text)) return "Jag kunde inte tolka kommandot.";
    return null;
  }

  function statusElement() {
    return global.document.getElementById("voiceInputStatus");
  }

  function handleStatusChange() {
    const el = statusElement();
    if (!el) return;
    const message = spokenMessageForStatus(el.textContent || "");
    if (message) speak(message);
  }

  function installObserver() {
    const el = statusElement();
    if (!el || !global.MutationObserver) return false;
    if (observer) observer.disconnect();
    observer = new global.MutationObserver(handleStatusChange);
    observer.observe(el, { childList: true, characterData: true, subtree: true });
    return true;
  }

  function updateToggle() {
    const button = global.document.getElementById("voiceSpeechFeedbackToggle");
    if (!button) return;
    button.textContent = isEnabled() ? "Talfeedback: på" : "Talfeedback: av";
    button.classList.toggle("secondary", !isEnabled());
  }

  function installToggle() {
    const panel = global.document.getElementById("voiceInputPanel");
    if (!panel || global.document.getElementById("voiceSpeechFeedbackToggle")) return;
    const toolbar = panel.querySelector(".voiceToolbar") || panel;
    const button = global.document.createElement("button");
    button.id = "voiceSpeechFeedbackToggle";
    button.type = "button";
    button.addEventListener("click", () => {
      const next = !isEnabled();
      setEnabled(next);
      if (next) speak("Talfeedback på.");
    });
    toolbar.appendChild(button);
    updateToggle();
  }

  function install() {
    if (!supportsSpeech()) return;
    installObserver();
    installToggle();
    if (global.speechSynthesis && typeof global.speechSynthesis.onvoiceschanged !== "undefined") {
      global.speechSynthesis.onvoiceschanged = () => pickVoice();
    }
  }

  global.SawVoiceSpeechFeedback = {
    speak,
    isEnabled,
    setEnabled,
    install,
  };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
