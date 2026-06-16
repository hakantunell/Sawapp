// fix-v44.js
// Media-session priming only. The shared voice engine in src/voice-input.js owns headset/media-key handling.
(function installVoiceMediaSessionPrime(global) {
  let silentAudio = null;
  let mediaPrimed = false;

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

  function install() {
    document.addEventListener("click", (event) => {
      const target = event.target && event.target.closest ? event.target.closest("#voiceInputToggle,#freeSawVoiceToggle") : null;
      if (target) primeHeadset();
    }, true);
  }

  global.SawVoiceRoute = { primeHeadset };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
