// src/media-key-debug.js
// Testpanel för att se vilka tangent-/mediaknappsevent webbläsaren får.

(function initMediaKeyDebug(global) {
  const MAX_EVENTS = 12;
  const events = [];

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
        <button id="clearMediaKeyDebug" type="button">Rensa</button>
      </div>
      <div class="mediaKeyDebugHint">Tryck på hörlurarnas knappar och se vilka events som kommer hit.</div>
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
  }

  function installMediaSessionDebug() {
    if (!global.navigator || !global.navigator.mediaSession || typeof global.navigator.mediaSession.setActionHandler !== "function") {
      recordEvent("mediaSession", { status: "Media Session API saknas" });
      return;
    }

    const actions = [
      "play",
      "pause",
      "previoustrack",
      "nexttrack",
      "seekbackward",
      "seekforward",
      "stop",
    ];

    for (const action of actions) {
      try {
        global.navigator.mediaSession.setActionHandler(action, () => {
          recordEvent("mediaSession", { action });
        });
      } catch (error) {
        recordEvent("mediaSession", { action, error: error.message });
      }
    }

    recordEvent("mediaSession", { status: "Media Session handlers aktiva" });
  }

  function install() {
    ensurePanel();
    installKeyboardDebug();
    installMediaSessionDebug();
  }

  global.SawMediaKeyDebug = { install, recordEvent };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})(window);
