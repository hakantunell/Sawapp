// src/render-packing-canvas.js
// Renderer för sågverks-/packningsvyn.
//
// Viktigt: den här modulen måste behålla v36-logiken:
// - rund/osågad sida kan ligga mot bädden
// - kvarvarande cirkelkropp, inte bara packningsrektanglar, styr bäddkontakt
// - svärdet visas som kedjehöjd över bädden

(function initSawRenderPacking(global) {
  function roundContactForStep(step) {
    if (typeof global.v36RoundContactForStep === "function") {
      return global.v36RoundContactForStep(step);
    }
    if (!step) return false;
    const rot = ((step.rotationValue || 0) % 360 + 360) % 360;
    return rot === 0 || rot === 90;
  }

  function remainingBodyBottomWithCuts(radiusMm, cuts, rotationValue) {
    if (typeof global.v36RemainingBodyBottomWithCuts === "function") {
      return global.v36RemainingBodyBottomWithCuts(radiusMm, cuts, rotationValue);
    }

    const theta = global.rotationToRadians(rotationValue || 0);
    let maxY = -Infinity;
    const samples = 1440;

    function keep(x, y) {
      return typeof global.pointKeptBySlabCuts === "function"
        ? global.pointKeptBySlabCuts(x, y, cuts)
        : true;
    }

    function add(x, y) {
      if (!keep(x, y)) return;
      const p = global.rotatePoint(x, y, theta);
      if (p.y > maxY) maxY = p.y;
    }

    for (let i = 0; i < samples; i++) {
      const a = (i / samples) * Math.PI * 2;
      add(Math.cos(a) * radiusMm, Math.sin(a) * radiusMm);
    }

    for (const c of (cuts || [])) {
      const val = c.value;
      if (c.axis === "y" && Math.abs(val) <= radiusMm) {
        const xh = Math.sqrt(Math.max(0, radiusMm * radiusMm - val * val));
        for (let i = 0; i <= 120; i++) {
          const x = -xh + (2 * xh * i) / 120;
          add(x, val);
        }
      }
      if (c.axis === "x" && Math.abs(val) <= radiusMm) {
        const yh = Math.sqrt(Math.max(0, radiusMm * radiusMm - val * val));
        for (let i = 0; i <= 120; i++) {
          const y = -yh + (2 * yh * i) / 120;
          add(val, y);
        }
      }
    }

    return Number.isFinite(maxY) ? maxY : radiusMm;
  }

  function latestPlansFallback() {
    return {
      packingLayout: global.SawLatestPlans && typeof global.SawLatestPlans.getPackingLayout === "function"
        ? global.SawLatestPlans.getPackingLayout()
        : null,
      sawmillCutPlan: global.SawLatestPlans && typeof global.SawLatestPlans.getSawmillCutPlan === "function"
        ? global.SawLatestPlans.getSawmillCutPlan()
        : null,
    };
  }

  function resolveStepIndex(explicitStepIndex, sawmillCutPlan) {
    const length = Array.isArray(sawmillCutPlan) ? sawmillCutPlan.length : 0;
    if (!length) return 0;

    if (Number.isFinite(explicitStepIndex)) {
      return Math.min(Math.max(explicitStepIndex, 0), length - 1);
    }

    if (global.SawState && typeof global.SawState.getCurrentStepIndex === "function") {
      return Math.min(Math.max(global.SawState.getCurrentStepIndex(), 0), length - 1);
    }

    try {
      if (typeof currentStepIndex !== "undefined") {
        return Math.min(Math.max(currentStepIndex, 0), length - 1);
      }
    } catch (e) {
      // Ignorera om legacy-bindningen inte är åtkomlig.
    }

    return 0;
  }

  function renderPackingCanvas(block, geom, v, packingLayout, sawmillCutPlan, explicitStepIndex) {
    const fallback = (!packingLayout || !sawmillCutPlan) ? latestPlansFallback() : null;
    const effectivePackingLayout = packingLayout || fallback?.packingLayout || null;
    const effectiveSawmillCutPlan = sawmillCutPlan || fallback?.sawmillCutPlan || null;

    const canvas = global.$ ? global.$("sawCanvas") : document.getElementById("sawCanvas");
    if (!canvas) return false;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2 + 18;
    const scale = Math.min((W - 150) / Math.max(geom.designDiameter, 1), (H - 130) / Math.max(geom.designDiameter, 1));
    const outerR = geom.designDiameter / 2 * scale;
    const usableR = geom.usableDiameter / 2 * scale;
    const bedY = outerR;

    const stepIndex = resolveStepIndex(explicitStepIndex, effectiveSawmillCutPlan);
    const planStep = effectiveSawmillCutPlan && effectiveSawmillCutPlan[stepIndex] ? effectiveSawmillCutPlan[stepIndex] : effectiveSawmillCutPlan?.[0];
    const theta = planStep ? global.rotationToRadians(planStep.rotationValue || 0) : 0;
    const slabCuts = global.completedSlabCuts(effectiveSawmillCutPlan, stepIndex);

    const packingBottom = global.remainingPackingBoundsWithSlabCuts(
      effectivePackingLayout,
      effectiveSawmillCutPlan,
      stepIndex,
      planStep ? planStep.rotationValue : 0
    );
    const bodyBottom = remainingBodyBottomWithCuts(
      geom.designDiameter / 2,
      slabCuts,
      planStep ? planStep.rotationValue : 0
    );
    const supportBottom = roundContactForStep(planStep) ? bodyBottom : packingBottom;
    const yShift = bedY - supportBottom * scale;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.save();
    ctx.translate(0, yShift);
    ctx.rotate(theta);

    ctx.fillStyle = "#fff7ed";
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.fill();
    global.drawBarkRing(ctx, outerR, v.bark * scale);

    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, usableR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    global.drawRemovedSlabs(ctx, slabCuts, outerR, scale);

    const done = global.completedPackingSources(effectiveSawmillCutPlan, stepIndex);
    (effectivePackingLayout || []).forEach((r, idx) => {
      const cx0 = r.x + r.w / 2;
      const cy0 = r.y + r.h / 2;
      if (done.has(r) || !global.pointKeptBySlabCuts(cx0, cy0, slabCuts)) return;
      ctx.fillStyle = r.type === "center" ? "rgba(74, 222, 128, .42)" : (r.wildEdge ? "rgba(250, 204, 21, .45)" : "rgba(96, 165, 250, .35)");
      ctx.strokeStyle = r.type === "center" ? "#16a34a" : (r.wildEdge ? "#ca8a04" : "#2563eb");
      ctx.lineWidth = r.type === "center" ? 3 : 2;
      ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
      ctx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
      ctx.fillStyle = "#0f172a";
      ctx.font = r.type === "center" ? "18px system-ui" : "13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${idx + 1}. ${r.label}`, (r.x + r.w / 2) * scale, (r.y + r.h / 2) * scale + 4);
    });

    ctx.restore();

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-outerR - 65, bedY);
    ctx.lineTo(outerR + 65, bedY);
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.font = "16px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("bädd / stockstöd", -outerR - 65, bedY + 22);

    if (planStep) {
      const h1 = Number.isFinite(planStep.rootSupportHeight) ? planStep.rootSupportHeight : planStep.bladeToBed;
      const h2 = Number.isFinite(planStep.topSupportHeight) ? planStep.topSupportHeight : planStep.bladeToBed;
      const bladeHeight = ((h1 || 0) + (h2 || 0)) / 2;
      const bladeY = bedY - bladeHeight * scale;

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(-outerR - 65, bladeY);
      ctx.lineTo(outerR + 65, bladeY);
      ctx.stroke();
      ctx.setLineDash([]);

      const action = planStep.kind === "slab" ? "ta bort ytterdel" : (planStep.kind === "side" ? "frigör" : "blocka");
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`Aktuellt steg ${planStep.step}: ${action} ${planStep.label}`, 0, -outerR - 18);

      const fmtIn = typeof global.fmtIn === "function" ? global.fmtIn : (mm) => `${(mm / 25.4).toFixed(2)}\"`;

      const x1 = -outerR - 42;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, bladeY); ctx.lineTo(x1, bedY);
      ctx.moveTo(x1 - 8, bladeY); ctx.lineTo(x1 + 8, bladeY);
      ctx.moveTo(x1 - 8, bedY); ctx.lineTo(x1 + 8, bedY);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`stöd 1: ${h1.toFixed(0)} mm / ${fmtIn(h1)}`, x1 + 12, (bladeY + bedY) / 2);

      const x2 = outerR + 42;
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x2, bladeY); ctx.lineTo(x2, bedY);
      ctx.moveTo(x2 - 8, bladeY); ctx.lineTo(x2 + 8, bladeY);
      ctx.moveTo(x2 - 8, bedY); ctx.lineTo(x2 + 8, bedY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#2563eb";
      ctx.textAlign = "right";
      ctx.fillText(`stöd 2: ${h2.toFixed(0)} mm / ${fmtIn(h2)}`, x2 - 10, (bladeY + bedY) / 2);

      ctx.fillStyle = "#475569";
      ctx.font = "13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(
        "Tidigare snitt är borttagna; kvarvarande kropp ligger mot bädden. Svärdet visas som kedjehöjd över bädd.",
        0,
        bedY + 44
      );
    }

    ctx.restore();
    return true;
  }

  global.SawRenderPacking = {
    renderPackingCanvas,
  };

  if (typeof global.renderPackingCanvas === "function") {
    global.renderPackingCanvasLegacy = global.renderPackingCanvas;
    global.renderPackingCanvas = renderPackingCanvas;
  }

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
