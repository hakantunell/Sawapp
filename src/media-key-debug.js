// src/media-key-debug.js
// Testpanel för att se vilka tangent-/mediaknappsevent webbläsaren får.

(function initMediaKeyDebug(global) {
  const MAX_EVENTS = 16;
  const events = [];
  let installed = false;
  let silentAudio = null;

  function $(id) {
    return global.document.getElementById(id);
  }

  function ensurePanel() {
    const dataPanel = global.document.querySelector(".bigDataPanel");
    if (!dataPanel || $("mediaKeyDebugPanel")) return;

    const panel = global.document.createElement("div");
    panel.id = "mediaKeyDebugPanel";
    panel.className = "mediaKeyDebugPanel";
    panel.innerHTML = `
      <div class="mediaKeyDebugHeader">
        <strong>Knapp-test</strong>
        <button id="activateMediaSessionDebug" type="button">Aktivera</button>
        <button id="clearMediaKeyDebug" type="button">Rensa</button>
      </div>
      <div class="mediaKeyDebugHint">Tryck Aktivera först. Testa sedan tangentbord, Play/Pause och nästa/föregående på hörlurarna.</div>
      <pre id="mediaKeyDebugLog" class="mediaKeyDebugLog">Inga events ännu.</pre>
    `;

    const controls = dataPanel.querySelector(".bigControls");
    if (controls) dataPanel.insertBefore(panel, controls);
    else dataPanel.appendChild(panel);

    const clearButton = $("clearMediaKeyDebug");
    if (clearButton) {
      clearButton.addEventListener("click", () => {
        events.length = 0;
        renderEvents();
      });
    }

    const activateButton = $("activateMediaSessionDebug");
    if (activateButton) {
      activateButton.addEventListener("click", activateMediaSession);
    }
  }

  function renderEvents() {
    const log = $("mediaKeyDebugLog");
    if (!log) return;
    if (!events.length) {
      log.textContent = "Inga events ännu.";
      return;
    }
    log.textContent = events.map((event) => JSON.stringify(event)).join("\n");
  }

  function recordEvent(source, data) {
    const item = {
      time: new Date().toLocaleTimeString(),
      source,
      focused: global.document.hasFocus(),
      visibility: global.document.visibilityState,
      ...data,
    };
    events.unshift(item);
    events.splice(MAX_EVENTS);
    renderEvents();
  }

  function installKeyboardDebug() {
    global.addEventListener("keydown", (event) => {
      recordEvent("keydown", {
        key: event.key,
        code: event.code,
        repeat: event.repeat,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
      });
    }, true);

    global.addEventListener("keyup", (event) => {
      recordEvent("keyup", {
        key: event.key,
        code: event.code,
      });
    }, true);
  }

  function installFocusDebug() {
    global.addEventListener("focus", () => recordEvent("window", { event: "focus" }));
    global.addEventListener("blur", () => recordEvent("window", { event: "blur" }));
    global.document.addEventListener("visibilitychange", () => recordEvent("document", { event: "visibilitychange" }));
  }

  function createSilentAudio() {
    if (silentAudio) return silentAudio;

    silentAudio = global.document.createElement("audio");
    silentAudio.id = "sawMediaSessionSilentAudio";
    silentAudio.loop = true;
    silentAudio.volume = 0;
    silentAudio.muted = true;
    silentAudio.setAttribute("playsinline", "");
    silentAudio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
    silentAudio.style.display = "none";
    global.document.body.appendChild(silentAudio);
    return silentAudio;
  }

  function activateMediaSession() {
    try {
      const audio = createSilentAudio();
      const playResult = audio.play();
      if (playResult && typeof playResult.then === "function") {
        playResult
          .then(() => recordEvent("silentAudio", { status: "play ok" }))
          .catch((error) => recordEvent("silentAudio", { status: "play failed", error: error.message }));
      }
    } catch (error) {
      recordEvent("silentAudio", { status: "create/play failed", error: error.message });
    }

    installMediaSessionDebug(true);
  }

  function installMediaSessionDebug(forceLog) {
    if (!global.navigator || !global.navigator.mediaSession || typeof global.navigator.mediaSession.setActionHandler !== "function") {
      recordEvent("mediaSession", { status: "Media Session API saknas" });
      return;
    }

    const actions = ["play", "pause", "previoustrack", "nexttrack", "seekbackward", "seekforward", "stop"];

    try {
      global.navigator.mediaSession.metadata = new global.MediaMetadata({
        title: "Sawapp knapp-test",
        artist: "Sawapp",
        album: "Sågskärm",
      });
    } catch (error) {
      recordEvent("mediaSession", { status: "metadata failed", error: error.message });
    }

    for (const action of actions) {
      try {
        global.navigator.mediaSession.setActionHandler(action, () => {
          recordEvent("mediaSession", { action, playbackState: global.navigator.mediaSession.playbackState || "unknown" });
        });
      } catch (error) {
        recordEvent("mediaSession", { action, error: error.message });
      }
    }

    try {
      global.navigator.mediaSession.playbackState = "playing";
    } catch (error) {
      recordEvent("mediaSession", { status: "playbackState failed", error: error.message });
    }

    if (forceLog) {
      recordEvent("mediaSession", { status: "aktiverad", playbackState: global.navigator.mediaSession.playbackState || "unknown" });
    }
  }

  function install() {
    if (installed) return;
    installed = true;
    ensurePanel();
    installKeyboardDebug();
    installFocusDebug();
    installMediaSessionDebug(true);
  }

  global.SawMediaKeyDebug = { install, recordEvent, activateMediaSession };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})(window);
