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
      active: global.document.activeElement ? `${global.document.activeElement.tagName}${global.document.activeElement.id ? `#${global.document.activeElement.id}` : ""}` : "none",
      visibility: global.document.visibilityState,
      ...data,
    };
    events.unshift(item);
    events.splice(MAX_EVENTS);
    renderEvents();
  }

  function focusPage() {
    const target = $("bigTab") || global.document.body;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    try {
      target.focus({ preventScroll: true });
    } catch (error) {
      try { target.focus(); } catch (_) {}
    }
  }

  function ensurePanel() {
    const dataPanel = global.document.querySelector(".bigDataPanel");
    if (!dataPanel) return;

    let panel = $("mediaKeyDebugPanel");
    if (!panel) {
      panel = global.document.createElement("div");
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
    }

    if (!panel.dataset.bound) {
      panel.addEventListener("pointerdown", () => recordEvent("pointer", { event: "pointerdown on debug panel" }), true);
      panel.addEventListener("click", (event) => {
        const target = event.target;
        if (target && target.id === "clearMediaKeyDebug") {
          events.length = 0;
          renderEvents();
          return;
        }
        if (target && target.id === "activateMediaSessionDebug") {
          recordEvent("button", { event: "activate click received" });
          focusPage();
          activateMediaSession();
          return;
        }
        recordEvent("click", { id: target && target.id ? target.id : "", tag: target && target.tagName ? target.tagName : "" });
      }, true);
      panel.dataset.bound = "true";
    }
  }

  function installKeyboardDebug() {
    const handler = (event, source) => {
      recordEvent(source, {
        key: event.key,
        code: event.code,
        repeat: event.repeat,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
      });
    };

    global.addEventListener("keydown", (event) => handler(event, "window.keydown"), true);
    global.addEventListener("keyup", (event) => handler(event, "window.keyup"), true);
    global.document.addEventListener("keydown", (event) => handler(event, "document.keydown"), true);
    global.document.addEventListener("keyup", (event) => handler(event, "document.keyup"), true);
    global.document.body.addEventListener("keydown", (event) => handler(event, "body.keydown"), true);
    global.document.body.addEventListener("keyup", (event) => handler(event, "body.keyup"), true);
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
    silentAudio.volume = 0.001;
    silentAudio.muted = false;
    silentAudio.setAttribute("playsinline", "");
    silentAudio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
    silentAudio.style.display = "none";
    global.document.body.appendChild(silentAudio);
    return silentAudio;
  }

  function activateMediaSession() {
    recordEvent("activate", { event: "start" });
    try {
      const audio = createSilentAudio();
      const playResult = audio.play();
      if (playResult && typeof playResult.then === "function") {
        playResult
          .then(() => recordEvent("silentAudio", { status: "play ok" }))
          .catch((error) => recordEvent("silentAudio", { status: "play failed", error: error.message }));
      } else {
        recordEvent("silentAudio", { status: "play returned sync" });
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
      if (global.MediaMetadata) {
        global.navigator.mediaSession.metadata = new global.MediaMetadata({ title: "Sawapp knapp-test", artist: "Sawapp", album: "Sågskärm" });
      }
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

    if (forceLog) recordEvent("mediaSession", { status: "aktiverad", playbackState: global.navigator.mediaSession.playbackState || "unknown" });
  }

  function install() {
    if (installed) return;
    installed = true;
    ensurePanel();
    installKeyboardDebug();
    installFocusDebug();
    installMediaSessionDebug(true);
    recordEvent("debug", { status: "installerad" });
  }

  global.SawMediaKeyDebug = { install, recordEvent, activateMediaSession };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
