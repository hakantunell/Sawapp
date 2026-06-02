// fix-v38.js
// Fyller i UI-falt som saknas pa steg fran sagverks-/packningsplanen.
//
// buildSawmillCutPlan() skapar andra typer av steg an legacy buildSawList().
// UI:t forvantar sig fortfarande bl.a. step.reference och step.cut.

(function installSawmillCutPlanStepLabels(global) {
  if (typeof global.buildSawmillCutPlan !== "function") {
    console.warn("buildSawmillCutPlan saknas. fix-v38 hoppas over.");
    return;
  }

  const legacyBuildSawmillCutPlan = global.buildSawmillCutPlan;

  function referenceForStep(step) {
    if (!step) return "–";
    if (step.reference) return step.reference;
    if (step.kind === "slab") return "Yttersnitt / slabba";
    if (step.kind === "side") return "Planksnitt / sidobit";
    if (step.kind === "center") return "Blockning av kärna";
    return "Beräknad referens";
  }

  function cutForStep(step) {
    if (!step) return "–";
    if (step.cut) return step.cut;
    if (step.kind === "slab") return `Ta bort ytterdel före ${step.label || "sidobit"}`;
    if (step.kind === "side") return `Frigör ${step.label || "sidobit"}`;
    if (step.kind === "center") return `Blocka ${step.label || "kärna"}`;
    return step.label || "Snitt";
  }

  global.buildSawmillCutPlan = function buildSawmillCutPlanWithStepLabels(packingLayout, block, geom, values) {
    const plan = legacyBuildSawmillCutPlan(packingLayout, block, geom, values);
    if (!Array.isArray(plan)) return plan;

    plan.forEach((step) => {
      step.reference = referenceForStep(step);
      step.cut = cutForStep(step);
    });

    return plan;
  };

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
