// src/voice-feedback.js
// Ljudåterkoppling när mätläge/röstinmatning startas och stoppas.

(function initVoiceFeedback(global) {
  let lastKnownListening = null;
  let lastSignalAt = 0;
  let audioContext = null;

  function voiceButton() {
    return global.document.getElementById("voiceInputToggle");
  }

  function isListening() {
    const button = voiceButton();
    if (!button) return false;
    return button.classList.contains("voiceListening") || /stoppa/i.test(button.textContent || "");
  }

  function ensureAudioContext() {
    const AudioContextCtor = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!audioContext) audioContext = new AudioContextCtor();
    if (audioContext.state === "suspended" && typeof audioContext.resume === "function") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function playTone(frequency, startOffset, duration, volume) {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime + Number(startOffset || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume || 0.09, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (error) {}
  }

  function playStartSignal() {
    playTone(1000, 0, 0.08, 0.09);
    playTone(1000, 0.15, 0.08, 0.09);
  }

  function playStopSignal() {
    playTone(600, 0, 0.42, 0.085);
  }

  function signalCurrentState(force) {
    const listening = isListening();
    if (!force && listening === lastKnownListening) return;
    const now = Date.now();
    if (now - lastSignalAt < 250) return;
    lastSignalAt = now;
    lastKnownListening = listening;
    if (listening) playStartSignal();
    else playStopSignal();
  }

  function afterVoiceToggle() {
    global.setTimeout(() => signalCurrentState(false), 140);
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

  global.SawVoiceFeedback = { playStartSignal, playStopSignal, signalCurrentState };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
