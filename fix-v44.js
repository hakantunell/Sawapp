// fix-v44.js
// Route voice start/toggle to the active view and keep a media session alive for headset buttons.
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

  function toggleActiveVoice() {
    if (isFreeSawActive() && global.SawFreeSaw && typeof global.SawFreeSaw.toggleVoice === "function") {
      if (global.SawVoiceInput && typeof global.SawVoiceInput.stop === "function") global.SawVoiceInput.stop();
      global.SawFreeSaw.toggleVoice();
      return true;
    }
    if (global.SawFreeSaw && typeof global.SawFreeSaw.stopVoice === "function") global.SawFreeSaw.stopVoice();
    if (global.SawVoiceInput && typeof global.SawVoiceInput.toggle === "function") {
      global.SawVoiceInput.toggle();
      return true;
    }
    return false;
  }

  function primeHeadset() {
    if (mediaPrimed) return true;
    mediaPrimed = true;

    try {
      if (global.navigator && global.navigator.mediaSession) {
        global.navigator.mediaSession.metadata = new global.MediaMetadata({
          title: "Sawapp röststyrning",
          artist: "Sawapp",
          album: "Mätning"
        });
      }
    } catch (error) {}

    try {
      // Tiny silent WAV. Some mobile browsers only dispatch headset play/pause
      // events to pages that have an active media element/session.
      silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA==");
      silentAudio.loop = true;
      silentAudio.volume = 0;
      const playResult = silentAudio.play();
      if (playResult && typeof playResult.catch === "function") playResult.catch(() => {});
    } catch (error) {}

    return true;
  }

  function runMediaToggle(event) {
    const now = Date.now();
    if (event && event.repeat && now - lastMediaToggleAt < 700) return;
    if (now - lastMediaToggleAt < 450) return;
    lastMediaToggleAt = now;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    primeHeadset();
    toggleActiveVoice();
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
      toggleActiveVoice();
    }, true);
  }

  function installMediaKeyRoute() {
    const handler = (event) => {
      if (!isMediaKeyEvent(event)) return;
      runMediaToggle(event);
    };

    global.addEventListener("keydown", handler, true);
    global.addEventListener("keyup", handler, true);

    if (global.navigator && global.navigator.mediaSession && typeof global.navigator.mediaSession.setActionHandler === "function") {
      ["play", "pause", "stop"].forEach((action) => {
        try { global.navigator.mediaSession.setActionHandler(action, () => runMediaToggle()); } catch (error) {}
      });
    }
  }

  function install() {
    installClickFallback();
    installMediaKeyRoute();
  }

  global.SawVoiceRoute = { primeHeadset, toggleActiveVoice };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
