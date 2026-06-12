// src/voice-feedback.js
// Talad återkoppling när mätläge/röstinmatning startas och stoppas.

(function initVoiceFeedback(global) {
  let lastKnownListening = null;
  let lastSpokenAt = 0;

  function voiceButton() {
    return global.document.getElementById("voiceInputToggle");
  }

  function isListening() {
    const button = voiceButton();
    if (!button) return false;
    return button.classList.contains("voiceListening") || /stoppa/i.test(button.textContent || "");
  }

  function speak(text) {
    if (!global.speechSynthesis || !global.SpeechSynthesisUtterance) return;
    const now = Date.now();
    if (now - lastSpokenAt < 350) return;
    lastSpokenAt = now;

    try {
      global.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "sv-SE";
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      global.speechSynthesis.speak(utterance);
    } catch (error) {}
  }

  function announceCurrentState(force) {
    const listening = isListening();
    if (!force && listening === lastKnownListening) return;
    lastKnownListening = listening;
    speak(listening ? "Mätläge påbörjat" : "Mätläge avslutat");
  }

  function afterVoiceToggle() {
    global.setTimeout(() => announceCurrentState(false), 120);
  }

  function install() {
    lastKnownListening = isListening();

    global.addEventListener("keydown", (event) => {
      if (event.key !== "MediaPlayPause") return;
      afterVoiceToggle();
    }, true);

    global.document.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || target.id !== "voiceInputToggle") return;
      afterVoiceToggle();
    }, true);

    const button = voiceButton();
    if (button) button.title = "Play/Pause på hörlurarna startar eller stoppar mätläge.";
  }

  global.SawVoiceFeedback = { speak, announceCurrentState };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
