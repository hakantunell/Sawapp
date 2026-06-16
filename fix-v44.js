// fix-v44.js
// Route voice start/toggle to the active view.
// Fixes free-saw voice start button and headset/media button behaviour on the Frisågning tab.
(function installVoiceRouteFix(global) {
  let lastMediaToggleAt = 0;

  function $(id) {
    return global.document.getElementById(id);
  }

  function isFreeSawActive() {
    const tab = $("freeSawTab");
    return !!tab && tab.classList.contains("active");
  }

  function isMediaKeyEvent(event) {
    return event && (
      event.key === "MediaPlayPause" ||
      event.code === "MediaPlayPause" ||
      event.keyCode === 179 ||
      event.which === 179
    );
  }

  function toggleFreeSawVoice() {
    if (!global.SawFreeSaw || typeof global.SawFreeSaw.toggleVoice !== "function") return false;
    if (global.SawVoiceInput && typeof global.SawVoiceInput.stop === "function") {
      global.SawVoiceInput.stop();
    }
    global.SawFreeSaw.toggleVoice();
    return true;
  }

  function installClickFallback() {
    global.document.addEventListener("click", (event) => {
      const button = event.target && event.target.closest ? event.target.closest("#freeSawVoiceToggle") : null;
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      toggleFreeSawVoice();
    }, true);
  }

  function installMediaKeyRoute() {
    const handler = (event) => {
      if (!isMediaKeyEvent(event) || !isFreeSawActive()) return;
      const now = Date.now();
      if (event.repeat && now - lastMediaToggleAt < 700) return;
      if (now - lastMediaToggleAt < 450) return;
      lastMediaToggleAt = now;
      event.preventDefault();
      event.stopPropagation();
      toggleFreeSawVoice();
    };

    global.addEventListener("keydown", handler, true);
    global.addEventListener("keyup", handler, true);

    if (global.navigator && global.navigator.mediaSession && typeof global.navigator.mediaSession.setActionHandler === "function") {
      ["play", "pause"].forEach((action) => {
        try {
          global.navigator.mediaSession.setActionHandler(action, () => {
            if (isFreeSawActive()) toggleFreeSawVoice();
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

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
