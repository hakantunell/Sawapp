// fix-v44.js
// Route voice start/toggle only where needed. Do not steal the old headset handler on the main saw screen.
(function installVoiceRouteFix(global) {
  let lastMediaToggleAt = 0;
  let silentAudio = null;
  let mediaPrimed = false;

  function $(id) { return global.document.getElementById(id); }

  function isFreeSawActive() {
    const tab = $("freeSawTab");
    return !!tab && tab.classList.contains("active");
  }

  function isMediaKeyEvent(event) {
    return event && (
      event.key === "MediaPlayPause" ||
      event.code === "MediaPlayPause" ||
      event.key === "Play" ||
      event.code === "Play" ||
      event.key === "Pause" ||
      event.code === "Pause" ||
      event.keyCode === 179 ||
      event.which === 179
    );
  }

  function toggleFreeSawVoice() {
    if (!global.SawFreeSaw || typeof global.SawFreeSaw.toggleVoice !== "function") return false;
    if (global.SawVoiceInput && typeof global.SawVoiceInput.stop === "function") global.SawVoiceInput.stop();
    global.SawFreeSaw.toggleVoice();
    return true;
  }

  function primeHeadset() {
    if (mediaPrimed) return true;
    mediaPrimed = true;

    try {
      if (global.navigator && global.navigator.mediaSession && global.MediaMetadata) {
        global.navigator.mediaSession.metadata = new global.MediaMetadata({
          title: "Sawapp röststyrning",
          artist: "Sawapp",
          album: "Mätning"
        });
      }
    } catch (error) {}

    try {
      silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA==");
      silentAudio.loop = true;
      silentAudio.volume = 0;
      const playResult = silentAudio.play();
      if (playResult && typeof playResult.catch === "function") playResult.catch(() => {});
    } catch (error) {}

    return true;
  }

  function runFreeSawMediaToggle(event) {
    const now = Date.now();
    if (event && event.repeat && now - lastMediaToggleAt < 900) return;
    if (now - lastMediaToggleAt < 700) return;
    lastMediaToggleAt = now;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    primeHeadset();
    toggleFreeSawVoice();
  }

  function installClickFallback() {
    global.document.addEventListener("click", (event) => {
      const freeButton = event.target && event.target.closest ? event.target.closest("#freeSawVoiceToggle") : null;
      const mainButton = event.target && event.target.closest ? event.target.closest("#voiceInputToggle") : null;
      if (!freeButton && !mainButton) return;
      primeHeadset();
      if (!freeButton) return;
      event.preventDefault();
      event.stopPropagation();
      toggleFreeSawVoice();
    }, true);
  }

  function installMediaKeyRoute() {
    const handler = (event) => {
      if (!isMediaKeyEvent(event)) return;
      // Let the original src/voice-input.js media-key handler handle the normal saw screen.
      // Only intercept when Frisågning is active.
      if (!isFreeSawActive()) return;
      runFreeSawMediaToggle(event);
    };

    global.addEventListener("keydown", handler, true);
    global.addEventListener("keyup", handler, true);

    if (global.navigator && global.navigator.mediaSession && typeof global.navigator.mediaSession.setActionHandler === "function") {
      ["play", "pause", "stop"].forEach((action) => {
        try {
          global.navigator.mediaSession.setActionHandler(action, () => {
            if (isFreeSawActive()) runFreeSawMediaToggle();
            else if (global.SawVoiceInput && typeof global.SawVoiceInput.toggle === "function") global.SawVoiceInput.toggle();
          });
        } catch (error) {}
      });
    }
  }

  function install() {
    installClickFallback();
    installMediaKeyRoute();
  }

  global.SawVoiceRoute = { primeHeadset, toggleFreeSawVoice };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
