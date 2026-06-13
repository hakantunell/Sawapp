// src/packing-canvas-blade-fix.js
// Fixar svärdslinjen i packnings-/sågverksvyn så att slabbsnitt ritas på faktisk snittlinje.

(function initSawPackingCanvasBladeFix(global) {
  if (!global.SawPackingCanvasParts) return;

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

    if (planStep.kind === "slab") {
      if (side === "top") return { axis: "y", value: r.y, kerfDir: 1 };
      if (side === "bottom") return { axis: "y", value: r.y + r.h, kerfDir: -1 };
      if (side === "right") return { axis: "x", value: r.x + r.w, kerfDir: -1 };
      if (side === "left") return { axis: "x", value: r.x, kerfDir: 1 };
    }

    if (side === "top") return { axis: "y", value: r.y + r.h, kerfDir: 1 };
    if (side === "bottom") return { axis: "y", value: r.y, kerfDir: -1 };
    if (side === "right") return { axis: "x", value: r.x, kerfDir: -1 };
    if (side === "left") return { axis: "x", value: r.x + r.w, kerfDir: 1 };
    return null;
  }

  function drawKerfBand(ctx, layout, boundary) {
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
    drawKerfBand(ctx, layout, boundary);

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
    ctx.fillText(`Aktuellt steg ${planStep.step}: ${planStep.kind === "side" ? "frigör" : "ta bort ytterdel"} ${planStep.label}`, 0, -outerR - 18);

    ctx.fillStyle = "#475569";
    ctx.font = "13px system-ui";
    ctx.fillText("Tidigare frigjorda ytterzoner/slabbor är borttagna; kvarvarande kropp ligger mot bädden.", 0, bedY + 44);
  }

  global.SawPackingCanvasParts.drawPackingBlade = drawPackingBlade;
})(window);
