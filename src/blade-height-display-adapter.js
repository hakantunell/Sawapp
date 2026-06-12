// src/blade-height-display-adapter.js
// Visningsadapter för såghöjd/stödhöjd.
// Beräkningar ligger kvar i mm; detta påverkar bara presentationen.

(function installBladeHeightDisplayAdapter(global) {
  function $(id) {
    return global.document.getElementById(id);
  }

  function formatBladeHeight(value) {
    if (typeof global.formatBladeHeight === "function") return global.formatBladeHeight(value);
    if (global.SawFormat && typeof global.SawFormat.formatBladeHeight === "function") return global.SawFormat.formatBladeHeight(value);
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toFixed(0)} mm` : "–";
  }

  function currentContext() {
    if (global.SawUpdatePipeline && typeof global.SawUpdatePipeline.buildPlanContext === "function") {
      return global.SawUpdatePipeline.buildPlanContext();
    }
    return null;
  }

  function stepHeights(context) {
    const step = context && context.step;
    if (!step) return null;
    const h1 = Number.isFinite(step.rootSupportHeight) ? step.rootSupportHeight : step.bladeToBed;
    const h2 = Number.isFinite(step.topSupportHeight) ? step.topSupportHeight : step.bladeToBed;
    return { h1, h2 };
  }

  function updateWorkScreenSupportValues(context) {
    const heights = stepHeights(context || currentContext());
    if (!heights) return;

    const support1 = $("bigSupport1Value");
    const support2 = $("bigSupport2Value");
    const support1Label = $("bigSupport1Label");
    const support2Label = $("bigSupport2Label");

    if (support1) support1.textContent = formatBladeHeight(heights.h1);
    if (support2) support2.textContent = formatBladeHeight(heights.h2);
    if (support1Label) support1Label.textContent = `Stöd 1: ${formatBladeHeight(heights.h1)}`;
    if (support2Label) support2Label.textContent = `Stöd 2: ${formatBladeHeight(heights.h2)}`;
  }

  function installWorkScreenPatch() {
    if (!global.SawWorkScreen || typeof global.SawWorkScreen.renderWorkScreen !== "function") return;
    if (global.SawWorkScreen.__bladeHeightDisplayPatched) return;

    const originalRender = global.SawWorkScreen.renderWorkScreen;
    global.SawWorkScreen.renderWorkScreen = function renderWorkScreenWithBladeHeightDisplay(context) {
      const result = originalRender.call(global.SawWorkScreen, context);
      updateWorkScreenSupportValues(result || context);
      return result;
    };
    global.renderWorkScreen = global.SawWorkScreen.renderWorkScreen;
    global.SawWorkScreen.__bladeHeightDisplayPatched = true;
  }

  function installCanvasPatch() {
    const parts = global.SawTimberCanvasParts;
    if (!parts || typeof parts.drawTimberBladeAndSupports !== "function") return;
    if (parts.__bladeHeightDisplayPatched) return;

    const originalDraw = parts.drawTimberBladeAndSupports;
    parts.drawTimberBladeAndSupports = function drawTimberBladeAndSupportsWithBladeHeightDisplay(layout) {
      const previous = global.formatBladeHeightForCanvas;
      global.formatBladeHeightForCanvas = formatBladeHeight;
      try {
        return originalDraw.call(parts, layout);
      } finally {
        global.formatBladeHeightForCanvas = previous;
      }
    };
    parts.__bladeHeightDisplayPatched = true;
  }

  global.SawBladeHeightDisplay = {
    formatBladeHeight,
    updateWorkScreenSupportValues,
    installWorkScreenPatch,
    installCanvasPatch,
  };

  installWorkScreenPatch();
  installCanvasPatch();
})(window);
