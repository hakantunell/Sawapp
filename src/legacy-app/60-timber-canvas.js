function renderTimberCanvas(block, geom, v, sawList) {
  if (window.SawTimberCanvasParts) {
    const layout = window.SawTimberCanvasParts.buildTimberCanvasLayout(block, geom, v, sawList);
    if (!layout) return;

    const packingLayoutForCanvas = window.SawLatestPlans && typeof window.SawLatestPlans.getPackingLayout === "function"
      ? window.SawLatestPlans.getPackingLayout()
      : null;

    const ctx = layout.ctx;
    ctx.save();
    ctx.translate(layout.cx, layout.cy);

    window.SawTimberCanvasParts.drawTimberPhysicalBody(layout, block, v, packingLayoutForCanvas);
    window.SawTimberCanvasParts.drawTimberWaneLabel(layout, block);
    window.SawTimberCanvasParts.drawTimberBed(layout);
    window.SawTimberCanvasParts.drawTimberBladeAndSupports(layout);

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
  const barkPx = v.bark * scale;

  const stepIndex = window.SawState.getCurrentStepIndex();
  const step = sawList[stepIndex] || sawList[0];
  const theta = step && !step.isFirstCut ? rotationToRadians(step.rotationValue) : 0;
  const planes = completedCutPlanes(block, sawList, stepIndex);

  // v15:
  // Om en redan sågad blockyta ligger nedåt efter rotation, ska den plana blockytan
  // ligga på bädden. Annars vilar stocken på kvarvarande rundstock/spill.
  const bedY = outerR;
  let bottomLocal;
  if (shouldSupportOnBlockFace(block, sawList, stepIndex, step ? step.rotationValue : 0)) {
    bottomLocal = blockBottomAfterRotation(block, step ? step.rotationValue : 0) * scale;
  } else {
    bottomLocal = retainedShapeBottomAfterRotation(outerR, step ? step.rotationValue : 0, planes, scale);
  }
  const yShift = bedY - bottomLocal;

  ctx.save();
  ctx.translate(cx, cy);

  // Fysisk kropp: stock + block, roterad och flyttad som helhet.
  ctx.save();
  ctx.translate(0, yShift);
  ctx.rotate(theta);

  // Stock med redan utförda snitt bortklippta.
  ctx.save();
  applyCompletedCutClip(ctx, planes, outerR, scale);

  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.arc(0,0,outerR,0,Math.PI*2);
  ctx.fill();

  drawBarkRing(ctx, outerR, barkPx);
  ctx.restore();

  // Snittytor som redan finns.
  drawCompletedCutLines(ctx, planes, outerR, scale);

  // Användbar diameter och centrumlinjer följer stocken.
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2;
  ctx.setLineDash([8,6]);
  ctx.beginPath();
  ctx.arc(0,0,usableR,0,Math.PI*2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.setLineDash([6,6]);
  ctx.beginPath();
  ctx.moveTo(-outerR,0); ctx.lineTo(outerR,0);
  ctx.moveTo(0,-outerR); ctx.lineTo(0,outerR);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sågverk / packning: rita hela packningslayouten i stället för bara centrumblocket.
  const packingLayoutForCanvas = window.SawLatestPlans.getPackingLayout();

  if (packingLayoutForCanvas && packingLayoutForCanvas.length) {
    packingLayoutForCanvas.forEach((r, idx) => {
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
  } else {
// Slutligt block visas som referens och roteras med kroppen.
  if (block) {
    const bw = block.width * scale;
    const bh = block.height * scale;
    ctx.fillStyle = "rgba(74, 222, 128, .42)";
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 3;
    ctx.fillRect(-bw/2, -bh/2, bw, bh);
    ctx.strokeRect(-bw/2, -bh/2, bw, bh);
    ctx.fillStyle = "#0f172a";
    ctx.font = "18px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${block.width} × ${block.height}`, 0, 6);
  }

  
  }

  ctx.restore(); // physical body

  if (block && block.allowedWane > 0) {
    ctx.fillStyle = "#7c3aed";
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`Hörnvankant tillåten: ${block.allowedWane.toFixed(1)} mm`, 0, -outerR - 14);
  }

  // Bädden är alltid horisontell och stilla.
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

  // Svärd/kedja är alltid horisontellt i toppen.
  if (step) {
    const bladeY = bedY - (step.supportHeightAverage ?? step.bladeToBed) * scale;

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.setLineDash([10,6]);
    ctx.beginPath();
    ctx.moveTo(-outerR-65, bladeY);
    ctx.lineTo(outerR+65, bladeY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(`svärd/kedja – steg ${step.step}`, outerR+65, bladeY-8);

    const x1 = -outerR-42;
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, bladeY);
    ctx.lineTo(x1, bedY);
    ctx.moveTo(x1-8, bladeY);
    ctx.lineTo(x1+8, bladeY);
    ctx.moveTo(x1-8, bedY);
    ctx.lineTo(x1+8, bedY);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`stöd 1: ${step.rootSupportHeight.toFixed(0)} mm / ${fmtIn(step.rootSupportHeight)}`, x1+12, (bladeY+bedY)/2);

    const x2 = outerR+42;
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.setLineDash([5,5]);
    ctx.beginPath();
    ctx.moveTo(x2, bladeY);
    ctx.lineTo(x2, bedY);
    ctx.moveTo(x2-8, bladeY);
    ctx.lineTo(x2+8, bladeY);
    ctx.moveTo(x2-8, bedY);
    ctx.lineTo(x2+8, bedY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#2563eb";
    ctx.textAlign = "right";
    ctx.fillText(`stöd 2: ${step.topSupportHeight.toFixed(0)} mm / ${fmtIn(step.topSupportHeight)}`, x2-10, (bladeY+bedY)/2);

    if (Math.abs(step.rootSupportHeight - step.topSupportHeight) > 0.1) {
      ctx.fillStyle = "#475569";
      ctx.font = "13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(
        "Tvärsnittsbilden visar medelhöjd; ställ in rot- och stöd 2 enligt måtten.",
        0,
        bedY + 46
      );
    }
  }

  ctx.restore();
}
