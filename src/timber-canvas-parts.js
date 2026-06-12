// src/timber-canvas-parts.js
// Delrenderers och layoutberäkning för timmer-canvas.

(function initSawTimberCanvasParts(global) {
  function canvasContext(canvasId) {
    const canvas = global.$ ? global.$(canvasId) : global.document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    return { canvas, ctx, W, H };
  }

  function packingSupportBottomLocal(packingLayout, sawList, stepIndex, rotationValue) {
    if (!packingLayout || !packingLayout.length) return null;
    if (typeof global.remainingPackingBoundsWithSlabCuts === "function") {
      const bottom = global.remainingPackingBoundsWithSlabCuts(packingLayout, sawList, stepIndex, rotationValue || 0);
      return Number.isFinite(bottom) ? bottom : null;
    }
    return null;
  }

  function buildTimberCanvasLayout(block, geom, v, sawList, packingLayout) {
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
    const barkPx = v.bark * scale;
    const kerfPx = Math.max(1, (Number(v.kerf) || 0) * scale);

    const stepIndex = global.SawState && typeof global.SawState.getCurrentStepIndex === "function"
      ? global.SawState.getCurrentStepIndex()
      : 0;
    const step = (sawList && sawList[stepIndex]) || (sawList && sawList[0]) || null;
    const rotationValue = step ? step.rotationValue : 0;
    const theta = step && !step.isFirstCut ? global.rotationToRadians(rotationValue) : 0;
    const planes = typeof global.completedCutPlanes === "function"
      ? global.completedCutPlanes(block, sawList, stepIndex)
      : [];

    const bedY = outerR;
    const packingBottom = packingSupportBottomLocal(packingLayout, sawList, stepIndex, rotationValue);
    const supportOnBlockFace = typeof global.shouldSupportOnBlockFace === "function" &&
      global.shouldSupportOnBlockFace(block, sawList, stepIndex, rotationValue);
    const bottomLocal = Number.isFinite(packingBottom)
      ? packingBottom * scale
      : supportOnBlockFace && typeof global.blockBottomAfterRotation === "function"
        ? global.blockBottomAfterRotation(block, rotationValue) * scale
        : global.retainedShapeBottomAfterRotation(outerR, rotationValue, planes, scale);
    const yShift = bedY - bottomLocal;

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
      barkPx,
      kerfPx,
      stepIndex,
      step,
      rotationValue,
      theta,
      planes,
      bedY,
      yShift,
      packingLayout,
      packingBottomLocal: packingBottom,
    };
  }

  function currentCutBoundaryForStep(step, block) {
    if (!step) return null;

    if (step.source && typeof global.slabCutBoundaryForStep === "function") {
      const boundary = global.slabCutBoundaryForStep(step);
      if (boundary) return boundary;
    }

    if (step.source && (step.kind === "side" || step.kind === "slab")) {
      const r = step.source;
      const phase = step.cutPhase || (step.kind === "slab" ? "outer" : "inner");
      if (step.side === "top") return { axis: "y", op: ">=", value: phase === "outer" ? r.y : r.y + r.h };
      if (step.side === "bottom") return { axis: "y", op: "<=", value: phase === "outer" ? r.y + r.h : r.y };
      if (step.side === "right") return { axis: "x", op: "<=", value: phase === "outer" ? r.x + r.w : r.x };
      if (step.side === "left") return { axis: "x", op: ">=", value: phase === "outer" ? r.x : r.x + r.w };
    }

    if (!block) return null;
    if (step.side === "top") return { axis: "y", op: ">=", value: -block.height / 2 };
    if (step.side === "bottom") return { axis: "y", op: "<=", value: block.height / 2 };
    if (step.side === "right") return { axis: "x", op: "<=", value: block.width / 2 };
    if (step.side === "left") return { axis: "x", op: ">=", value: -block.width / 2 };
    return null;
  }

  function localBladeY(layout) {
    const boundary = currentCutBoundaryForStep(layout.step, null);
    if (boundary) return boundary.value * layout.scale;
    const step = layout.step;
    if (!step) return 0;
    return (layout.bedY - (step.supportHeightAverage ?? step.bladeToBed) * layout.scale) - layout.yShift;
  }

  function globalBladeY(layout) {
    return layout.yShift + localBladeY(layout);
  }

  function drawRemovedSideFromBoundary(ctx, boundary, R, scale, fillStyle) {
    if (!boundary) return;
    const margin = 90;
    const v = boundary.value * scale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = fillStyle || "rgba(239, 68, 68, .16)";
    ctx.strokeStyle = "rgba(239, 68, 68, .28)";
    ctx.lineWidth = 1;
    ctx.beginPath();

    if (boundary.axis === "y" && boundary.op === ">=") ctx.rect(-R - margin, -R - margin, 2 * (R + margin), v + R + margin);
    else if (boundary.axis === "y" && boundary.op === "<=") ctx.rect(-R - margin, v, 2 * (R + margin), R + margin - v);
    else if (boundary.axis === "x" && boundary.op === ">=") ctx.rect(-R - margin, -R - margin, v + R + margin, 2 * (R + margin));
    else if (boundary.axis === "x" && boundary.op === "<=") ctx.rect(v, -R - margin, R + margin - v, 2 * (R + margin));

    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawCurrentPieceHighlight(ctx, step, scale) {
    if (!step || step.kind !== "side" || !step.source) return;
    const r = step.source;
    ctx.save();
    ctx.fillStyle = "rgba(250, 204, 21, .38)";
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 3;
    ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
    ctx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
    ctx.fillStyle = "#713f12";
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("frigörs nu", (r.x + r.w / 2) * scale, (r.y + r.h / 2) * scale + 5);
    ctx.restore();
  }

  function drawCurrentCutVisualization(layout, block) {
    const { ctx, outerR, scale, step } = layout;
    if (!step) return;
    const boundary = currentCutBoundaryForStep(step, block);
    drawRemovedSideFromBoundary(ctx, boundary, outerR, scale, "rgba(239, 68, 68, .14)");
    drawCurrentPieceHighlight(ctx, step, scale);
  }

  function drawTimberPhysicalBody(layout, block, v, packingLayout) {
    const { ctx, outerR, usableR, barkPx, scale, planes } = layout;

    ctx.save();
    ctx.translate(0, layout.yShift);
    ctx.rotate(layout.theta);

    ctx.save();
    global.applyCompletedCutClip(ctx, planes, outerR, scale);
    ctx.fillStyle = "#fff7ed";
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.fill();
    global.drawBarkRing(ctx, outerR, barkPx);
    ctx.restore();

    drawCurrentCutVisualization(layout, block);
    global.drawCompletedCutLines(ctx, planes, outerR, scale);

    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, usableR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(-outerR, 0);
    ctx.lineTo(outerR, 0);
    ctx.moveTo(0, -outerR);
    ctx.lineTo(0, outerR);
    ctx.stroke();
    ctx.setLineDash([]);

    drawTimberPackingOrBlock(ctx, block, scale, packingLayout, layout.step);
    ctx.restore();
  }

  function drawTimberPackingOrBlock(ctx, block, scale, packingLayout, step) {
    if (packingLayout && packingLayout.length) {
      packingLayout.forEach((r, idx) => {
        const isCurrentSidePiece = step && step.kind === "side" && step.source === r;
        ctx.fillStyle = isCurrentSidePiece
          ? "rgba(250, 204, 21, .46)"
          : r.type === "center" ? "rgba(74, 222, 128, .42)" : (r.wildEdge ? "rgba(250, 204, 21, .45)" : "rgba(96, 165, 250, .35)");
        ctx.strokeStyle = isCurrentSidePiece
          ? "#ca8a04"
          : r.type === "center" ? "#16a34a" : (r.wildEdge ? "#ca8a04" : "#2563eb");
        ctx.lineWidth = isCurrentSidePiece ? 4 : (r.type === "center" ? 3 : 2);
        ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        ctx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        ctx.fillStyle = "#0f172a";
        ctx.font = r.type === "center" ? "18px system-ui" : "13px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`${idx + 1}. ${r.label}`, (r.x + r.w / 2) * scale, (r.y + r.h / 2) * scale + 4);
      });
      return;
    }

    if (!block) return;
    const bw = block.width * scale;
    const bh = block.height * scale;
    ctx.fillStyle = "rgba(74, 222, 128, .42)";
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 3;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = "#0f172a";
    ctx.font = "18px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${block.width} × ${block.height}`, 0, 6);
  }

  function drawTimberWaneLabel(layout, block) {
    if (!block || block.allowedWane <= 0) return;
    const { ctx, outerR } = layout;
    ctx.fillStyle = "#7c3aed";
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`Hörnvankant tillåten: ${block.allowedWane.toFixed(1)} mm`, 0, -outerR - 14);
  }

  function drawTimberBed(layout) {
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

  function drawKerfBand(ctx, layout, bladeY) {
    const { outerR, kerfPx } = layout;
    if (!Number.isFinite(kerfPx) || kerfPx <= 1) return;
    const left = -outerR - 65;
    const width = 2 * (outerR + 65);
    ctx.save();
    ctx.fillStyle = "rgba(239, 68, 68, .18)";
    ctx.fillRect(left, bladeY - kerfPx, width, kerfPx);
    ctx.strokeStyle = "rgba(239, 68, 68, .35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(left, bladeY - kerfPx, width, kerfPx);
    ctx.restore();
  }

  function drawTimberBladeAndSupports(layout) {
    const { ctx, outerR, bedY, step } = layout;
    if (!step) return;
    const bladeY = globalBladeY(layout);

    drawKerfBand(ctx, layout, bladeY);

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(-outerR - 65, bladeY);
    ctx.lineTo(outerR + 65, bladeY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(`svärd/kedja – steg ${step.step}`, outerR + 65, bladeY - 8);

    drawSupportMeasure(ctx, { x: -outerR - 42, bladeY, bedY, value: step.rootSupportHeight, label: "stöd 1", strokeStyle: "#ef4444", textAlign: "left", textXOffset: 12, dashed: false });
    drawSupportMeasure(ctx, { x: outerR + 42, bladeY, bedY, value: step.topSupportHeight, label: "stöd 2", strokeStyle: "#2563eb", textAlign: "right", textXOffset: -10, dashed: true });

    if (Math.abs(step.rootSupportHeight - step.topSupportHeight) > 0.1) {
      ctx.fillStyle = "#475569";
      ctx.font = "13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Tvärsnittsbilden visar medelhöjd; ställ in rot- och stöd 2 enligt måtten.", 0, bedY + 46);
    }
  }

  function drawSupportMeasure(ctx, options) {
    const formatHeight = typeof global.formatBladeHeightForCanvas === "function"
      ? global.formatBladeHeightForCanvas
      : (typeof global.formatBladeHeight === "function" ? global.formatBladeHeight : null);
    const valueLabel = formatHeight ? formatHeight(options.value) : `${options.value.toFixed(0)} mm`;

    ctx.strokeStyle = options.strokeStyle;
    ctx.lineWidth = 2;
    if (options.dashed) ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(options.x, options.bladeY);
    ctx.lineTo(options.x, options.bedY);
    ctx.moveTo(options.x - 8, options.bladeY);
    ctx.lineTo(options.x + 8, options.bladeY);
    ctx.moveTo(options.x - 8, options.bedY);
    ctx.lineTo(options.x + 8, options.bedY);
    ctx.stroke();
    if (options.dashed) ctx.setLineDash([]);

    ctx.fillStyle = options.strokeStyle;
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = options.textAlign;
    ctx.fillText(`${options.label}: ${valueLabel}`, options.x + options.textXOffset, (options.bladeY + options.bedY) / 2);
  }

  global.SawTimberCanvasParts = {
    buildTimberCanvasLayout,
    drawTimberPhysicalBody,
    drawTimberWaneLabel,
    drawTimberBed,
    drawTimberBladeAndSupports,
    drawTimberPackingOrBlock,
  };
})(window);