// v37.2: korrigerar sidobits-snitt.
// Mål:
// - När stocken ligger på osågad/rund sida mot stöden: använd två olika nivåer för ytterdel och planka.
// - När stocken ligger på redan sågad plan yta mot stöden: behåll v36-höjden.
//
// Praktiskt utifrån test:
// - steg 1 och 2 är rätt efter v37.1
// - steg 5 och 6 är rätt efter v37.1
// - steg 3, 4, 7, 8 ska inte få v37.1-påslaget
// Ladda efter app.js och fix-v36.js.

function v37ThicknessFromStep(step) {
  if (!step) return 0;
  if (Number.isFinite(step.thickness) && step.thickness > 0) return step.thickness;
  const m = String(step.label || "").match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return 0;
  return Math.min(Number(m[1]), Number(m[2])) || 0;
}

function v37Kerf() {
  try {
    const v = typeof values === "function" ? values() : {};
    return Number(v.kerf || 0);
  } catch (_) {
    return 0;
  }
}

function v37SetHeights(step, root, top) {
  step.rootSupportHeight = root;
  step.topSupportHeight = top;
  step.bladeToBed = (root + top) / 2;
  step.supportHeightAverage = step.bladeToBed;
  step.supportHeightDiff = root - top;
}

function v37IsRoundSideSupport(step) {
  const rot = ((step?.rotationValue || 0) % 360 + 360) % 360;
  // Enligt testbilderna är 0° och 90° de lägen där osågad/rund sida ligger mot stöden.
  // 180° och 270° ligger på redan sågad plan yta och ska därför behålla v36-värdena.
  return rot === 0 || rot === 90;
}

if (typeof buildSawmillCutPlan === "function" && !window.__v37SideCutHeightInstalled) {
  window.__v37SideCutHeightInstalled = true;
  const previousBuildSawmillCutPlan = buildSawmillCutPlan;

  buildSawmillCutPlan = function(...args) {
    const plan = previousBuildSawmillCutPlan.apply(this, args) || [];
    const kerfAllowance = v37Kerf() / 2;

    for (let i = 0; i < plan.length; i++) {
      const slab = plan[i];
      const side = plan[i + 1];
      if (!slab || !side) continue;
      if (slab.kind !== "slab" || side.kind !== "side") continue;
      if (slab.side !== side.side || slab.rotationValue !== side.rotationValue) continue;

      // Viktigt: justera bara när stocken ligger på rund/osågad sida mot bädden.
      // När stocken ligger på plan sågad sida mot stöden är v36-nivån rätt.
      if (!v37IsRoundSideSupport(slab)) continue;

      const t = v37ThicknessFromStep(side) || v37ThicknessFromStep(slab);
      if (!t) continue;

      const slabRootBase = Number.isFinite(slab.rootSupportHeight) ? slab.rootSupportHeight : (slab.bladeToBed || 0);
      const slabTopBase = Number.isFinite(slab.topSupportHeight) ? slab.topSupportHeight : (slab.bladeToBed || 0);

      // v36 ligger vid inner-/referenssnittet för dessa runda stöd-lägen.
      // Flytta ytterdelssnittet upp med plankans tjocklek + halv kerf.
      const outerRoot = slabRootBase + t + kerfAllowance;
      const outerTop = slabTopBase + t + kerfAllowance;
      v37SetHeights(slab, outerRoot, outerTop);
      slab.__v37OuterSlabAdjusted = true;
      slab.note = (slab.note || "") + " • Yttersnitt ovanför planka";

      // Frigöringssnittet ska ligga direkt under samma planka.
      v37SetHeights(side, outerRoot - t - kerfAllowance, outerTop - t - kerfAllowance);
      side.__v37InnerSideAdjusted = true;
      side.note = (side.note || "") + " • Frigöringssnitt direkt under planka";
    }

    return plan;
  };
}

if (typeof update === "function") update();
