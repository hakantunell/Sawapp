// src/voice-feedback.js
// Ljudåterkoppling när mätläge/röstinmatning startas och stoppas.

(function initVoiceFeedback(global) {
  let lastKnownListening = null;
  let lastSignalAt = 0;
  let audioContext = null;
  let observer = null;

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
      const start = ctx.currentTime + Number(startOffset || 0);
      const end = start + Number(duration || 0.1);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.cancelScheduledValues(start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(volume || 0.14, start + 0.012);
      gain.gain.setValueAtTime(volume || 0.14, Math.max(start + 0.013, end - 0.035));
      gain.gain.linearRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.03);
    } catch (error) {}
  }

  function playStartSignal() {
    playTone(1200, 0, 0.11, 0.16);
    playTone(1200, 0.18, 0.11, 0.16);
  }

  function playStopSignal() {
    playTone(650, 0, 0.55, 0.15);
  }

  function playStateSignal(listening, force) {
    const now = Date.now();
    if (!force && now - lastSignalAt < 300) return;
    lastSignalAt = now;
    lastKnownListening = listening;
    if (listening) playStartSignal();
    else playStopSignal();
  }

  function signalCurrentState(force) {
    const listening = isListening();
    if (!force && listening === lastKnownListening) return;
    playStateSignal(listening, force);
  }

  function installButtonObserver() {
    const button = voiceButton();
    if (!button || !global.MutationObserver) return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => signalCurrentState(false));
    observer.observe(button, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true, characterData: true });
  }

  function install() {
    lastKnownListening = isListening();
    installButtonObserver();

    global.addEventListener("keydown", (event) => {
      if (event.key !== "MediaPlayPause") return;
      ensureAudioContext();
      global.setTimeout(() => signalCurrentState(false), 40);
      global.setTimeout(() => signalCurrentState(false), 220);
    }, true);

    global.document.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || target.id !== "voiceInputToggle") return;
      ensureAudioContext();
      global.setTimeout(() => signalCurrentState(false), 40);
      global.setTimeout(() => signalCurrentState(false), 220);
    }, true);

    const button = voiceButton();
    if (button) button.title = "Play/Pause på hörlurarna startar eller stoppar mätläge.";
  }

  global.SawVoiceFeedback = { playStartSignal, playStopSignal, signalCurrentState };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
