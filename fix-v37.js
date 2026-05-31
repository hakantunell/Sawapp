// v37.3: korrigerar sidobits-snitt med full sågspår/kerf.
//
// När du ställer in sågen mäter du från underkant svärd/kedja ned till stödet.
// För att få en planka som är 20 mm tjock måste skillnaden mellan yttersnittet
// och frigöringssnittet vara: planktjocklek + sågspår.
// Exempel: 20 mm planka + 6 mm sågspår = 26 mm skillnad.
//
// Mål:
// - När stocken ligger på osågad/rund sida mot stöden: använd två nivåer.
// - När stocken ligger på redan sågad plan yta mot stöden: behåll v36-höjden.
// - Steg 1/2 och 5/6 påverkas. Steg 3/4 och 7/8 behåller plan-yte-logiken.
//
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
  return rot === 0 || rot === 90;
}

if (typeof buildSawmillCutPlan === "function" && !window.__v37SideCutHeightInstalled) {
  window.__v37SideCutHeightInstalled = true;
  const previousBuildSawmillCutPlan = buildSawmillCutPlan;

  buildSawmillCutPlan = function(...args) {
    const plan = previousBuildSawmillCutPlan.apply(this, args) || [];
    const kerfAllowance = v37Kerf(); // FULL kerf, inte halv kerf

    for (let i = 0; i < plan.length; i++) {
      const slab = plan[i];
      const side = plan[i + 1];
      if (!slab || !side) continue;
      if (slab.kind !== "slab" || side.kind !== "side") continue;
      if (slab.side !== side.side || slab.rotationValue !== side.rotationValue) continue;
      if (!v37IsRoundSideSupport(slab)) continue;

      const t = v37ThicknessFromStep(side) || v37ThicknessFromStep(slab);
      if (!t) continue;

      const innerRoot = Number.isFinite(slab.rootSupportHeight) ? slab.rootSupportHeight : (slab.bladeToBed || 0);
      const innerTop = Number.isFinite(slab.topSupportHeight) ? slab.topSupportHeight : (slab.bladeToBed || 0);

      // Yttersnittet ska ligga planktjocklek + hela sågspåret ovanför frigöringssnittet.
      const outerRoot = innerRoot + t + kerfAllowance;
      const outerTop = innerTop + t + kerfAllowance;
      v37SetHeights(slab, outerRoot, outerTop);
      slab.__v37OuterSlabAdjusted = true;
      slab.note = (slab.note || "") + " • Yttersnitt ovanför planka med full kerf";

      // Frigöringssnittet ligger kvar på den inre nivån.
      v37SetHeights(side, innerRoot, innerTop);
      side.__v37InnerSideAdjusted = true;
      side.note = (side.note || "") + " • Frigöringssnitt direkt under planka";
    }

    return plan;
  };
}

if (typeof update === "function") update();
