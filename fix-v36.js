// v36: Korrigerar svärd/kedja i Sågverk / packning.
// v36.1: Tar bort onödiga blockningssteg när sidobitarna redan frigör blockets fyra sidor.
// v36.2: När stocken ligger på osågad rund sida ska stöd 1/stöd 2 få olika höjd vid avsmalnande stock.
// v36.3: När stocken ligger på rund/osågad sida ska sågbilden också lägga rundbotten mot bädden.

function v36RoundContactForStep(step) {
  if (!step) return false;
  const rot = ((step.rotationValue || 0) % 360 + 360) % 360;
  return rot === 0 || rot === 90;
}

function v36ApplySupportHeightModel(plan) {
  if (!plan || !plan.length || typeof values !== "function") return plan;
  const v = values();
  const radiusDiffAcrossSupports = ((v.rootDiameter || 0) - (v.topDiameter || 0)) / 2;

  for (const s of plan) {
    const h1 = Number.isFinite(s.rootSupportHeight) ? s.rootSupportHeight : (s.bladeToBed || 0);
    const h2 = Number.isFinite(s.topSupportHeight) ? s.topSupportHeight : (s.bladeToBed || 0);
    const avg = (h1 + h2) / 2;

    if (v36RoundContactForStep(s)) {
      const halfSpread = radiusDiffAcrossSupports / 2;
      s.rootSupportHeight = avg + halfSpread;
      s.topSupportHeight = avg - halfSpread;
      s.supportHeightAverage = avg;
      s.supportHeightDiff = s.rootSupportHeight - s.topSupportHeight;
      s.note = (s.note || "") + (s.note?.includes("Rund sida mot bädd") ? "" : " • Rund sida mot bädd: olika stödvärden");
    } else {
      s.rootSupportHeight = avg;
      s.topSupportHeight = avg;
      s.supportHeightAverage = avg;
      s.supportHeightDiff = 0;
    }
  }
  return plan;
}

// Beräkna lägsta punkt för kvarvarande stock efter rotation och tidigare bortsågade zoner.
// Returnerar mm i samma koordinatsystem som remainingPackingBoundsWithSlabCuts.
function v36RemainingBodyBottomWithCuts(radiusMm, cuts, rotationValue) {
  const theta = rotationToRadians(rotationValue || 0);
  let maxY = -Infinity;
  const samples = 1440;

  function keep(x, y) {
    return typeof pointKeptBySlabCuts === "function" ? pointKeptBySlabCuts(x, y, cuts) : true;
  }

  function add(x, y) {
    if (!keep(x, y)) return;
    const p = rotatePoint(x, y, theta);
    if (p.y > maxY) maxY = p.y;
  }

  // Cirkelranden räcker i praktiken för rundsidan. Snittlinjer läggs också till för stabilitet.
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

if (typeof buildSawmillCutPlan === "function" && !window.__v36PlanFilterInstalled) {
  window.__v36PlanFilterInstalled = true;
  const originalBuildSawmillCutPlan = buildSawmillCutPlan;
  buildSawmillCutPlan = function(...args) {
    let plan = originalBuildSawmillCutPlan.apply(this, args) || [];

    const slabSteps = plan.filter(s => s.kind === "slab").length;
    const sideSteps = plan.filter(s => s.kind === "side").length;
    const sideNames = new Set(plan.filter(s => s.kind === "side").map(s => s.side));

    if (slabSteps >= 4 && sideSteps >= 4 && sideNames.size >= 4) {
      plan = plan.filter(s => s.kind !== "center");
      plan.forEach((s, i) => { s.step = i + 1; });
    }

    return v36ApplySupportHeightModel(plan);
  };
}

function renderPackingCanvas(block, geom, v, packingLayout, sawmillCutPlan) {
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

  const planStep = sawmillCutPlan && sawmillCutPlan[currentStepIndex] ? sawmillCutPlan[currentStepIndex] : sawmillCutPlan?.[0];
  const theta = planStep ? rotationToRadians(planStep.rotationValue || 0) : 0;
  const slabCuts = completedSlabCuts(sawmillCutPlan, currentStepIndex);

  const packingBottom = remainingPackingBoundsWithSlabCuts(
    packingLayout,
    sawmillCutPlan,
    currentStepIndex,
    planStep ? planStep.rotationValue : 0
  );
  const bodyBottom = v36RemainingBodyBottomWithCuts(geom.designDiameter / 2, slabCuts, planStep ? planStep.rotationValue : 0);
  const supportBottom = v36RoundContactForStep(planStep) ? bodyBottom : packingBottom;
  const yShift = bedY - supportBottom * scale;

  ctx.save();
  ctx.translate(cx, cy);

  ctx.save();
  ctx.translate(0, yShift);
  ctx.rotate(theta);

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

  drawRemovedSlabs(ctx, slabCuts, outerR, scale);

  const done = completedPackingSources(sawmillCutPlan, currentStepIndex);
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

  ctx.restore();

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

  if (planStep) {
    const h1 = Number.isFinite(planStep.rootSupportHeight) ? planStep.rootSupportHeight : planStep.bladeToBed;
    const h2 = Number.isFinite(planStep.topSupportHeight) ? planStep.topSupportHeight : planStep.bladeToBed;
    const bladeHeight = ((h1 || 0) + (h2 || 0)) / 2;
    const bladeY = bedY - bladeHeight * scale;

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 4;
    ctx.setLineDash([10,6]);
    ctx.beginPath();
    ctx.moveTo(-outerR-65, bladeY);
    ctx.lineTo(outerR+65, bladeY);
    ctx.stroke();
    ctx.setLineDash([]);

    const action = planStep.kind === "slab" ? "ta bort ytterdel" : (planStep.kind === "side" ? "frigör" : "blocka");
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`Aktuellt steg ${planStep.step}: ${action} ${planStep.label}`, 0, -outerR - 18);

    const x1 = -outerR - 42;
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, bladeY); ctx.lineTo(x1, bedY);
    ctx.moveTo(x1-8, bladeY); ctx.lineTo(x1+8, bladeY);
    ctx.moveTo(x1-8, bedY); ctx.lineTo(x1+8, bedY);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 13px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`stöd 1: ${h1.toFixed(0)} mm / ${fmtIn(h1)}`, x1+12, (bladeY+bedY)/2);

    const x2 = outerR + 42;
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.setLineDash([5,5]);
    ctx.beginPath();
    ctx.moveTo(x2, bladeY); ctx.lineTo(x2, bedY);
    ctx.moveTo(x2-8, bladeY); ctx.lineTo(x2+8, bladeY);
    ctx.moveTo(x2-8, bedY); ctx.lineTo(x2+8, bedY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#2563eb";
    ctx.textAlign = "right";
    ctx.fillText(`stöd 2: ${h2.toFixed(0)} mm / ${fmtIn(h2)}`, x2-10, (bladeY+bedY)/2);

    ctx.fillStyle = "#475569";
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Tidigare snitt är borttagna; kvarvarande kropp ligger mot bädden. Svärdet visas som kedjehöjd över bädd.", 0, bedY + 44);
  }

  ctx.restore();
}

if (typeof update === "function") update();
