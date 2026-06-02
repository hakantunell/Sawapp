// src/dimensions-state-sync.js
// Synkar legacy dimensions-UI till SawState.
//
// Legacy app.js har fortfarande `dimensions` som en lexikal variabel. Den går inte
// att läsa direkt från senare laddade adapterfiler. Den här bryggan läser därför
// dimensionsraderna efter renderDimensions() och håller SawState.dimensions i synk
// med det som faktiskt visas och används av legacy-UI:t.

(function installDimensionsStateSync(global) {
  if (!global.SawState) {
    console.warn("SawState saknas. Dimensions-state-sync aktiveras inte.");
    return;
  }

  if (typeof global.renderDimensions !== "function") {
    console.warn("renderDimensions saknas. Dimensions-state-sync aktiveras inte.");
    return;
  }

  const legacyRenderDimensions = global.renderDimensions;

  function numberValue(input, fallback = 0) {
    if (!input) return fallback;
    const value = Number(input.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function readDimensionsFromDom() {
    const list = global.document.getElementById("dimensionList");
    if (!list) return [];

    return [...list.querySelectorAll(".dimension-row")].map((row) => {
      const active = !!row.querySelector('input[type="checkbox"]')?.checked;
      const type = row.querySelector(".dim-type")?.value || "fixed";
      const height = numberValue(row.querySelector(".dim-height"));
      const widthInputValue = numberValue(row.querySelector(".dim-width"));
      const waneMm = numberValue(row.querySelector(".dim-wane"));
      const wildEdge = !!row.querySelector(".wild-edge")?.checked;

      return {
        active,
        type,
        width: type === "freeWidth" ? 0 : widthInputValue,
        height,
        minWidth: type === "minWidth" ? widthInputValue : widthInputValue,
        wildEdge,
        waneMm,
      };
    });
  }

  function syncDimensionsStateFromDom() {
    const dimensions = readDimensionsFromDom();
    if (dimensions.length) {
      global.SawState.setDimensions(dimensions);
    }
    return dimensions;
  }

  global.syncDimensionsStateFromDom = syncDimensionsStateFromDom;

  global.renderDimensions = function renderDimensionsWithStateSync() {
    legacyRenderDimensions();
    syncDimensionsStateFromDom();
  };

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
