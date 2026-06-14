// src/voice-speech-feedback.js
// Kort talsyntes-feedback för röstinmatning i sågskärmen.

(function initSawVoiceSpeechFeedback(global) {
  let lastSpokenKey = "";
  let lastSpokenAt = 0;
  let observer = null;

  const MESSAGES = {
    newStock: { sv: "Påbörja ny stock.", en: "Start new log." },
    support1: { sv: "Stöd ett registrerat.", en: "Support one registered." },
    support2: { sv: "Stöd två registrerat.", en: "Support two registered." },
    rootEnd: { sv: "Rotända registrerad.", en: "Root end registered." },
    topEnd: { sv: "Toppända registrerad.", en: "Top end registered." },
    length: { sv: "Längd registrerad.", en: "Length registered." },
    sweep: { sv: "Krokighet registrerad.", en: "Sweep registered." },
    bark: { sv: "Barktjocklek registrerad.", en: "Bark thickness registered." },
    planReady: { sv: "Sågplan beräknad.", en: "Saw plan calculated." },
    approved: { sv: "Godkänd.", en: "Approved." },
    rejected: { sv: "Kasserad.", en: "Rejected." },
    noProductApprove: { sv: "Ingen färdig bit att godkänna.", en: "No finished piece to approve." },
    noProductReject: { sv: "Ingen färdig bit att kassera.", en: "No finished piece to reject." },
    voiceError: { sv: "Röstfel.", en: "Voice error." },
    parseError: { sv: "Jag kunde inte tolka kommandot.", en: "I could not understand the command." },
    test: { sv: "Talfeedback fungerar.", en: "Speech feedback is working." },
  };

  function settings() { return global.SawVoiceSpeechSettings || null; }
  function supportsSpeech() { return !!global.speechSynthesis && !!global.SpeechSynthesisUtterance; }
  function isEnabled() {
    const s = settings();
    if (s && typeof s.isEnabled === "function") return s.isEnabled();
    try { return global.localStorage.getItem("sawapp.voiceSpeechFeedback.enabled") !== "false"; } catch (error) { return true; }
  }
  function language() {
    const s = settings();
    if (s && typeof s.language === "function") return s.language();
    try { return global.localStorage.getItem("sawapp.voiceSpeechFeedback.language") || "en"; } catch (error) { return "en"; }
  }
  function speechRate() {
    const s = settings();
    if (s && typeof s.speechRate === "function") return s.speechRate();
    return 1.0;
  }
  function langCode() { return language() === "sv" ? "sv-SE" : "en-US"; }

  function pickVoice() {
    if (!supportsSpeech()) return null;
    const s = settings();
    if (s && typeof s.selectedVoice === "function") {
      const selected = s.selectedVoice();
      if (selected) return selected;
    }
    const voices = global.speechSynthesis.getVoices ? global.speechSynthesis.getVoices() : [];
    const prefix = language() === "sv" ? /^sv/i : /^en/i;
    return voices.find((voice) => prefix.test(voice.lang || "")) || voices[0] || null;
  }

  function textForKey(key) {
    const item = MESSAGES[key];
    if (!item) return null;
    return item[language()] || item.en || item.sv || null;
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
      utterance.lang = langCode();
      utterance.rate = options && options.rate ? options.rate : speechRate();
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

  function speakKey(key) {
    const text = textForKey(key);
    return text ? speak(text) : false;
  }

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[åä]/g, "a").replace(/ö/g, "o").replace(/\s+/g, " ").trim();
  }

  function messageKeyForStatus(statusText) {
    const text = normalize(statusText);
    if (!text) return null;
    if (/ny stock/.test(text)) return "newStock";
    if (/diameter stod 1|stod 1/.test(text) && /\d/.test(text)) return "support1";
    if (/diameter stod 2|stod 2/.test(text) && /\d/.test(text)) return "support2";
    if (/rotanda|rotande/.test(text) && /\d/.test(text)) return "rootEnd";
    if (/toppanda|toppande/.test(text) && /\d/.test(text)) return "topEnd";
    if (/stocklangd|langd/.test(text) && /\d/.test(text)) return "length";
    if (/krokighet|krok/.test(text) && /\d/.test(text)) return "sweep";
    if (/bark/.test(text) && /\d/.test(text)) return "bark";
    if (/klar\. sagplanen ar beraknad/.test(text)) return "planReady";
    if (/godkand/.test(text)) return "approved";
    if (/kasserad/.test(text)) return "rejected";
    if (/ingen fardig bit att godkanna/.test(text)) return "noProductApprove";
    if (/ingen fardig bit att kassera/.test(text)) return "noProductReject";
    if (/rostfel/.test(text)) return "voiceError";
    if (/kunde inte hitta bade falt och varde/.test(text)) return "parseError";
    return null;
  }

  function statusElement() { return global.document.getElementById("voiceInputStatus"); }
  function handleStatusChange() {
    const el = statusElement();
    if (!el) return;
    const key = messageKeyForStatus(el.textContent || "");
    if (key) speakKey(key);
  }
  function installObserver() {
    const el = statusElement();
    if (!el || !global.MutationObserver) return false;
    if (observer) observer.disconnect();
    observer = new global.MutationObserver(handleStatusChange);
    observer.observe(el, { childList: true, characterData: true, subtree: true });
    return true;
  }
  function install() {
    if (!supportsSpeech()) return;
    installObserver();
    if (global.speechSynthesis && typeof global.speechSynthesis.onvoiceschanged !== "undefined") {
      global.speechSynthesis.onvoiceschanged = () => pickVoice();
    }
  }

  global.SawVoiceSpeechFeedback = { speak, speakKey, isEnabled, install };
  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
