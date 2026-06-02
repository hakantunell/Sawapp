// src/render-support-side-view.js
// Renderer för sidovyn som visar stöd 1 och stöd 2.
//
// Passiv modul tills den anropas från update-render-extract-adapter.

(function initSawRenderSupportSideView(global) {
  function formatInches(mm) {
    if (typeof global.fmtIn === "function") return global.fmtIn(mm);
    return `${(Number(mm || 0) / 25.4).toFixed(2)}\"`;
  }

  function renderSupportSideViewFromModel(model) {
    if (!model) return false;

    const step = model.step;
    const geom = model.geom;
    const s1 = global.document.getElementById("support1Label");
    const s2 = global.document.getElementById("support2Label");
    const view = global.document.getElementById("supportSideView");

    if (!s1 || !s2 || !view || !step) return false;

    const h1 = step.rootSupportHeight ?? step.bladeToBed ?? 0;
    const h2 = step.topSupportHeight ?? step.bladeToBed ?? 0;

    s1.textContent = `Stöd 1: ${h1.toFixed(0)} mm / ${formatInches(h1)}`;
    s2.textContent = `Stöd 2: ${h2.toFixed(0)} mm / ${formatInches(h2)}`;

    const log = view.querySelector(".logSide");
    if (log && geom) {
      const d1 = geom.support1Diameter || 0;
      const d2 = geom.support2Diameter || 0;
      log.style.setProperty("--d1", `${Math.max(18, Math.min(70, d1 / 5))}px`);
      log.style.setProperty("--d2", `${Math.max(18, Math.min(70, d2 / 5))}px`);
    }

    return true;
  }

  function renderSupportSideView(step, geom) {
    return renderSupportSideViewFromModel({ step, geom });
  }

  global.SawRenderSupportSideView = {
    renderSupportSideView,
    renderSupportSideViewFromModel,
  };

  global.renderSupportSideViewFromModel = renderSupportSideViewFromModel;
})(window);
