// src/packing-canvas-parts.js
// Delrenderers och layoutberäkning för legacy packnings-canvas.

(function initSawPackingCanvasParts(global) {
  function canvasContext(canvasId) {
    const canvas = global.$ ? global.$(canvasId) : global.document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    return { canvas, ctx, W, H };
  }

  function buildPackingCanvasLayout(geom, v, packingLayout, sawmillCutPlan) {
    const canvasState = canvasContext("sawCanvas");
    if (!canvasState || !geom) return null;

    const { ctx, W, H } = canvasState;
    const cx = W / 2;
    const cy = H / 2 + 18;
    const scale = Math.min(
      (W - 150) / Math.max(geom.designDiameter, 1),
      (H - 130) / Math.max(geom.designDiameter, 1)
    );
    const outerR = geom.designDiameter / 2 * scale;
    const usableR = geom.usableDiameter / 2 * scale;
    const kerfMm = Number(v.kerf) || 0;
    const kerfPx = Math.max(1, kerfMm * scale);
    const bedY = outerR;

    const stepIndex = global.SawState && typeof global.SawState.getCurrentStepIndex === "function"
      ? global.SawState.getCurrentStepIndex()
      : 0;
    const planStep = sawmillCutPlan && sawmillCutPlan[stepIndex]
      ? sawmillCutPlan[stepIndex]
      : (sawmillCutPlan && sawmillCutPlan[0]) || null;
    const rotationValue = planStep ? (planStep.rotationValue || 0) : 0;
    const theta = planStep ? global.rotationToRadians(rotationValue) : 0;
    const slabCuts = typeof global.completedSlabCuts === "function"
      ? global.completedSlabCuts(sawmillCutPlan, stepIndex)
      : [];
    const supportBottom = typeof global.remainingPackingBoundsWithSlabCuts === "function"
      ? global.remainingPackingBoundsWithSlabCuts(packingLayout, sawmillCutPlan, stepIndex, rotationValue)
      : 0;
    const yShift = bedY - supportBottom * scale;

    return {
      canvasState,
      ctx,
      W,
      H,
      cx,
      cy,
      scale,
      outerR,
      usableR,
      kerfMm,
      kerfPx,
      bedY,
      stepIndex,
      planStep,
      rotationValue,
      theta,
      slabCuts,
      supportBottom,
      yShift,
      packingLayout: Array.isArray(packingLayout) ? packingLayout : [],
    };
  }

  function drawPackingBody(layout, geom, v, packingLayout, sawmillCutPlan) {
    const { ctx, outerR, usableR, scale, slabCuts, stepIndex } = layout;

    ctx.save();
    ctx.translate(0, layout.yShift);
    ctx.rotate(layout.theta);

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
    drawRemainingPacking(layout, packingLayout, sawmillCutPlan, stepIndex);

    ctx.restore();
  }

  function drawRemainingPacking(layout, packingLayout, sawmillCutPlan, stepIndex) {
    const { ctx, scale, slabCuts } = layout;
    const done = typeof global.completedPackingSources === "function"
      ? global.completedPackingSources(sawmillCutPlan, stepIndex)
      : new Set();

    (packingLayout || []).forEach((r, idx) => {
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
  }

  function drawPackingBed(layout) {
    const { ctx, outerR, bedY } = layout;

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
  }

  function normalizeSide(side) {
    if (side === "över") return "top";
    if (side === "under") return "bottom";
    if (side === "höger") return "right";
    if (side === "vänster") return "left";
    return side;
  }

  function sideFromRect(rect) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    if (Math.abs(cx) > Math.abs(cy)) return cx > 0 ? "right" : "left";
    return cy > 0 ? "bottom" : "top";
  }

  function sourceRectForStep(layout, planStep) {
    const side = normalizeSide(planStep && planStep.side);
    const source = planStep && planStep.source;
    if (source && source.type !== "center" && sideFromRect(source) === side) return source;

    return (layout.packingLayout || []).find((rect) => rect.type !== "center" && sideFromRect(rect) === side) || source;
  }

  function bladeBoundary(layout, planStep) {
    const r = sourceRectForStep(layout, planStep);
    if (!planStep || !r) return null;
    const side = normalizeSide(planStep.side) || sideFromRect(r);
    const k = Number(layout.kerfMm) || 0;

    if (planStep.kind === "slab") {
      if (side === "top") return { axis: "y", value: r.y - k, kerfDir: 1 };
      if (side === "bottom") return { axis: "y", value: r.y + r.h + k, kerfDir: -1 };
      if (side === "right") return { axis: "x", value: r.x + r.w + k, kerfDir: -1 };
      if (side === "left") return { axis: "x", value: r.x - k, kerfDir: 1 };
    }

    if (side === "top") return { axis: "y", value: r.y + r.h, kerfDir: 1 };
    if (side === "bottom") return { axis: "y", value: r.y, kerfDir: -1 };
    if (side === "right") return { axis: "x", value: r.x, kerfDir: -1 };
    if (side === "left") return { axis: "x", value: r.x + r.w, kerfDir: 1 };
    return null;
  }

  function drawLocalKerfBand(ctx, layout, boundary) {
    const { outerR, kerfPx } = layout;
    if (!boundary || !Number.isFinite(kerfPx) || kerfPx <= 1) return;
    const margin = 65;
    const v = boundary.value * layout.scale;
    const dir = boundary.kerfDir || 1;

    ctx.save();
    ctx.fillStyle = "rgba(239, 68, 68, .18)";
    ctx.strokeStyle = "rgba(239, 68, 68, .35)";
    ctx.lineWidth = 1;
    if (boundary.axis === "y") {
      const y = dir > 0 ? v : v - kerfPx;
      ctx.fillRect(-outerR - margin, y, 2 * (outerR + margin), kerfPx);
      ctx.strokeRect(-outerR - margin, y, 2 * (outerR + margin), kerfPx);
    } else {
      const x = dir > 0 ? v : v - kerfPx;
      ctx.fillRect(x, -outerR - margin, kerfPx, 2 * (outerR + margin));
      ctx.strokeRect(x, -outerR - margin, kerfPx, 2 * (outerR + margin));
    }
    ctx.restore();
  }

  function drawPackingBlade(layout) {
    const { ctx, outerR, bedY, yShift, planStep } = layout;
    const boundary = bladeBoundary(layout, planStep);
    if (!planStep || !boundary) return;

    const margin = 65;
    const valuePx = boundary.value * layout.scale;

    ctx.save();
    ctx.translate(0, yShift);
    ctx.rotate(layout.theta);

    drawLocalKerfBand(ctx, layout, boundary);

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    if (boundary.axis === "y") {
      ctx.moveTo(-outerR - margin, valuePx);
      ctx.lineTo(outerR + margin, valuePx);
    } else {
      ctx.moveTo(valuePx, -outerR - margin);
      ctx.lineTo(valuePx, outerR + margin);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(
      `Aktuellt steg ${planStep.step}: ${planStep.kind === "side" ? "frigör" : "ta bort ytterdel"} ${planStep.label}`,
      0,
      -outerR - 18
    );

    ctx.fillStyle = "#475569";
    ctx.font = "13px system-ui";
    ctx.fillText(
      "Tidigare frigjorda ytterzoner/slabbor är borttagna; kvarvarande kropp ligger mot bädden.",
      0,
      bedY + 44
    );
  }

  global.SawPackingCanvasParts = {
    buildPackingCanvasLayout,
    drawPackingBody,
    drawRemainingPacking,
    drawPackingBed,
    drawPackingBlade,
  };
})(window);