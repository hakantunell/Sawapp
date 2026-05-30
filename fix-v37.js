// v37: första snittet för sidobit ska ligga på plankans yttersida, inte vid innerkanten mot blocket.
// Ladda efter app.js och fix-v36.js.

function v37ThicknessFromLabel(label) {
  const m = String(label || "").match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return 0;
  return Math.min(Number(m[1]), Number(m[2])) || 0;
}

if (typeof buildSawmillCutPlan === "function" && !window.__v37OuterSlabCutInstalled) {
  window.__v37OuterSlabCutInstalled = true;
  const previousBuildSawmillCutPlan = buildSawmillCutPlan;

  buildSawmillCutPlan = function(...args) {
    const plan = previousBuildSawmillCutPlan.apply(this, args) || [];

    for (const s of plan) {
      if (s.kind !== "slab" || s.__v37OuterSlabAdjusted) continue;

      const thickness = v37ThicknessFromLabel(s.label);
      if (!thickness) continue;

      // Slab-steget är snittet som tar bort ytterdelen FÖRE plankan.
      // Därför ska höjden ligga en planktjocklek utanför frigöringssnittet.
      s.rootSupportHeight = (Number.isFinite(s.rootSupportHeight) ? s.rootSupportHeight : (s.bladeToBed || 0)) + thickness;
      s.topSupportHeight = (Number.isFinite(s.topSupportHeight) ? s.topSupportHeight : (s.bladeToBed || 0)) + thickness;
      s.bladeToBed = ((s.rootSupportHeight || 0) + (s.topSupportHeight || 0)) / 2;
      s.__v37OuterSlabAdjusted = true;
      s.note = (s.note || "") + " • Yttersnitt ovanför planka";
    }

    return plan;
  };
}

if (typeof update === "function") update();
