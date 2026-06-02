// src/render-big-screen-step.js
// Renderer för storskärmens aktuella steg.
//
// Passiv modul. Den skriver endast till big screen-DOM om den anropas explicit
// av update-flöde eller adapter.

(function initSawRenderBigScreenStep(global) {
  function formatInches(mm) {
    if (typeof global.fmtIn === "function") return global.fmtIn(mm);
    return `${(Number(mm) / 25.4).toFixed(2)}\"`;
  }

  function setText(id, value) {
    const el = global.$ ? global.$(id) : document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderBigScreenStep(step) {
    if (!step) return;

    const rootSupportHeight = Number.isFinite(step.rootSupportHeight) ? step.rootSupportHeight : 0;
    const topSupportHeight = Number.isFinite(step.topSupportHeight) ? step.topSupportHeight : 0;
    const cut = step.cut || (
      step.kind === "slab" ? "Ta bort ytterdel" :
      step.kind === "side" ? `Frigör ${step.label}` :
      step.label ? `Blocka ${step.label}` : ""
    );

    setText("bigStep", `Steg ${step.step}`);
    setText(
      "bigHeight",
      `Stöd 1 ${rootSupportHeight.toFixed(0)} mm / ${formatInches(rootSupportHeight)} · Stöd 2 ${topSupportHeight.toFixed(0)} mm / ${formatInches(topSupportHeight)}`
    );
    setText("bigRotation", `Rotation ${step.rotation} – ${cut}`);
    setText("bigReference", step.reference || step.note || "");
  }

  global.SawRenderBigScreenStep = {
    renderBigScreenStep,
  };

  global.renderBigScreenStep = renderBigScreenStep;
})(window);
