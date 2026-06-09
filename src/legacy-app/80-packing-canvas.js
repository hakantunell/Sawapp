function renderPackingCanvas(block, geom, v, packingLayout, sawmillCutPlan) {
  if (window.SawPackingCanvasParts) {
    const layout = window.SawPackingCanvasParts.buildPackingCanvasLayout(geom, v, packingLayout, sawmillCutPlan);
    if (!layout) return;

    const ctx = layout.ctx;
    ctx.save();
    ctx.translate(layout.cx, layout.cy);

    window.SawPackingCanvasParts.drawPackingBody(layout, geom, v, packingLayout, sawmillCutPlan);
    window.SawPackingCanvasParts.drawPackingBed(layout);
    window.SawPackingCanvasParts.drawPackingBlade(layout);

    ctx.restore();
    return;
  }

  const canvas = $("sawCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const cx = W/2;
  const cy = H/2 + 18;
  const scale = Math.min((W-150)/Math.max(geom.designDiameter, 1), (H-130)/Math.max(geom.designDiameter, 1));
  const outerR = geom.designDiameter/2 * scale;
  const usableR = geom.usableDiameter/2 * scale;
  const bedY = outerR;

  const stepIndex = window.SawState.getCurrentStepIndex();
  const planStep = sawmillCutPlan && sawmillCutPlan[stepIndex] ? sawmillCutPlan[stepIndex] : sawmillCutPlan?.[0];
  const theta = planStep ? rotationToRadians(planStep.rotationValue || 0) : 0;

  const slabCuts = completedSlabCuts(sawmillCutPlan, stepIndex);
  const supportBottom = remainingPackingBoundsWithSlabCuts(packingLayout, sawmillCutPlan, stepIndex, planStep ? planStep.rotationValue : 0);
  const yShift = bedY - supportBottom * scale;

  ctx.save();
  ctx.translate(cx, cy);

  // Kroppen/stocken roteras och flyttas ned till bädden efter att tidigare sågade bitar tagits bort.
  ctx.save();
  ctx.translate(0, yShift);
  ctx.rotate(theta);

  // Rita stockcirkeln som bakgrund.
  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.arc(0,0,outerR,0,Math.PI*2);
  ctx.fill();
  drawBarkRing(ctx, outerR, v.bark * scale);

  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2;
  ctx.setLineDash([8,6]);
  ctx.beginPath();
  ctx.arc(0,0,usableR,0,Math.PI*2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Radera hela bortsågade ytterzoner/slabbor, inte bara plankrektangeln.
  drawRemovedSlabs(ctx, slabCuts, outerR, scale);

  // Rita kvarvarande layout.
  const done = completedPackingSources(sawmillCutPlan, stepIndex);
  packingLayout.forEach((r, idx) => {
    const cx0 = r.x + r.w / 2;
    const cy0 = r.y + r.h / 2;
    if (done.has(r) || !pointKeptBySlabCuts(cx0, cy0, slabCuts)) return;
    ctx.fillStyle = r.type === "center" ? "rgba(74, 222, 128, .42)" : (r.wildEdge ? "rgba(250, 204, 21, .45)" : "rgba(96, 165, 250, .35)");
    ctx.strokeStyle = r.type === "center" ? "#16a34a" : (r.wildEdge ? "#ca8a04" : "#2563eb");
    ctx.lineWidth = r.type === "center" ? 3 : 2;
    ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
    ctx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
    ctx.fillStyle = "#0f172a";
    ctx.font = r.type === "center" ? "18px system-ui" : "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${idx + 1}. ${r.label}`, (r.x + r.w/2) * scale, (r.y + r.h/2) * scale + 4);
  });

  ctx.restore(); // roterad/flyttad kropp

  // Bädden är fast.
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-outerR-65, bedY);
  ctx.lineTo(outerR+65, bedY);
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.font = "16px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("bädd / stockstöd", -outerR-65, bedY+22);

  // Svärdet är alltid horisontellt och visas på aktuell snittyta efter samma rotation/förskjutning.
  if (planStep && planStep.source) {
    const rb0 = rotatedRectBounds({
      x: planStep.source.x,
      y: planStep.source.y,
      w: planStep.source.w,
      h: planStep.source.h,
    }, planStep.rotationValue || 0);

    let bladeYLocal;
    if (planStep.kind === "slab") {
      bladeYLocal = rb0.minY;
    } else if (planStep.kind === "side") {
      bladeYLocal = rb0.maxY;
    } else {
      bladeYLocal = planStep.side === "bottom" ? rb0.maxY : rb0.minY;
    }

    const bladeY = yShift + bladeYLocal * scale;
    const minX = rb0.minX * scale;
    const maxX = rb0.maxX * scale;

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 4;
    ctx.setLineDash([10,6]);
    ctx.beginPath();
    ctx.moveTo(minX - 30, bladeY);
    ctx.lineTo(maxX + 30, bladeY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(
      `Aktuellt steg ${planStep.step}: ${planStep.kind === "side" ? "frigör" : "blocka"} ${planStep.label}`,
      0,
      -outerR - 18
    );

    ctx.fillStyle = "#475569";
    ctx.font = "13px system-ui";
    ctx.fillText(
      `Tidigare frigjorda ytterzoner/slabbor är borttagna; kvarvarande kropp ligger mot bädden.`,
      0,
      bedY + 44
    );
  }

  ctx.restore();
}
