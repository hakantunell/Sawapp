function retainedLogCutY(block) {
  // Första snittet är övre färdigyta på centrumblocket i ursprungsläget.
  // Allt ovanför denna linje är bortsågat efter första snittet.
  return block ? -block.height / 2 : 0;
}

function completedCutPlanes(block, sawList, currentStepIndex) {
  // Snitt som redan är gjorda före aktuellt steg.
  // Varje snitt motsvarar en färdig blockyta. Vi behåller insidan av blocket.
  if (!block) return [];
  const planes = [];
  for (let i = 0; i < currentStepIndex; i++) {
    const side = sawList[i]?.side;
    if (side === "top") planes.push({ axis: "y", op: ">=", value: -block.height / 2 });
    if (side === "bottom") planes.push({ axis: "y", op: "<=", value: block.height / 2 });
    if (side === "right") planes.push({ axis: "x", op: "<=", value: block.width / 2 });
    if (side === "left") planes.push({ axis: "x", op: ">=", value: -block.width / 2 });
  }
  return planes;
}

function pointInsideCompletedCuts(x, y, planes) {
  const eps = 0.001;
  for (const p of planes) {
    if (p.axis === "x") {
      if (p.op === "<=" && x > p.value + eps) return false;
      if (p.op === ">=" && x < p.value - eps) return false;
    } else {
      if (p.op === "<=" && y > p.value + eps) return false;
      if (p.op === ">=" && y < p.value - eps) return false;
    }
  }
  return true;
}

function retainedShapeBottomAfterRotation(outerR, rotationValue, planes, scale) {
  // Beräkna lägsta punkt (max y på skärmen) för stocken efter redan gjorda snitt
  // och efter aktuell rotation. Samplar både cirkelrand och snittlinjer.
  const theta = rotationToRadians(rotationValue || 0);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  let maxY = -Infinity;

  function addPoint(x, y) {
    if (!pointInsideCompletedCuts(x / scale, y / scale, planes)) return;
    const yr = x * sin + y * cos;
    if (yr > maxY) maxY = yr;
  }

  // Cirkelrand
  const samples = 1440;
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    addPoint(Math.cos(a) * outerR, Math.sin(a) * outerR);
  }

  // Snittplanens linjer där de skär cirkeln.
  for (const p of planes) {
    const val = p.value * scale;
    if (p.axis === "y") {
      const xh = Math.sqrt(Math.max(0, outerR*outerR - val*val));
      for (let i = 0; i <= 160; i++) {
        const x = -xh + (2*xh*i/160);
        addPoint(x, val);
      }
    } else {
      const yh = Math.sqrt(Math.max(0, outerR*outerR - val*val));
      for (let i = 0; i <= 160; i++) {
        const y = -yh + (2*yh*i/160);
        addPoint(val, y);
      }
    }
  }

  return Number.isFinite(maxY) ? maxY : outerR;
}

function applyCompletedCutClip(ctx, planes, outerR, scale) {
  // Klipp bort allt som redan sågats bort. Planen är i blockets/stockens lokala koordinater.
  for (const p of planes) {
    const val = p.value * scale;
    ctx.beginPath();
    if (p.axis === "y" && p.op === ">=") {
      ctx.rect(-outerR-50, val, 2*(outerR+50), 2*(outerR+50));
    } else if (p.axis === "y" && p.op === "<=") {
      ctx.rect(-outerR-50, -outerR-50, 2*(outerR+50), val + outerR + 50);
    } else if (p.axis === "x" && p.op === "<=") {
      ctx.rect(-outerR-50, -outerR-50, val + outerR + 50, 2*(outerR+50));
    } else if (p.axis === "x" && p.op === ">=") {
      ctx.rect(val, -outerR-50, 2*(outerR+50), 2*(outerR+50));
    }
    ctx.clip();
  }
}

function drawCompletedCutLines(ctx, planes, outerR, scale) {
  ctx.save();
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 3;
  for (const p of planes) {
    const val = p.value * scale;
    ctx.beginPath();
    if (p.axis === "y") {
      const xh = Math.sqrt(Math.max(0, outerR*outerR - val*val));
      ctx.moveTo(-xh, val);
      ctx.lineTo(xh, val);
    } else {
      const yh = Math.sqrt(Math.max(0, outerR*outerR - val*val));
      ctx.moveTo(val, -yh);
      ctx.lineTo(val, yh);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawRetainedLogAtCurrentRotation(ctx, step, block, outerR, barkPx) {
  const isFirst = !step || step.isFirstCut;
  const theta = isFirst ? 0 : rotationToRadians(step.rotationValue);
  const cutY = retainedLogCutY(block) * 1; // local mm-to-pixel already applied by caller via blockPx below? See renderCanvas.

  // This function is called after scale is already applied to block/cut values.
  ctx.save();
  ctx.rotate(theta);

  if (isFirst) {
    ctx.fillStyle = "#fff7ed";
    ctx.beginPath();
    ctx.arc(0,0,outerR,0,Math.PI*2);
    ctx.fill();
    drawBarkRing(ctx, outerR, barkPx);
    ctx.restore();
    return;
  }

  const yCutPx = block ? -block.height / 2 : 0;

  // Clip to retained part: y >= yCutPx in the stock's own rotated coordinate system.
  ctx.save();
  ctx.beginPath();
  ctx.rect(-outerR - 20, yCutPx, (outerR + 20) * 2, (outerR + 20) * 2);
  ctx.clip();

  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.arc(0,0,outerR,0,Math.PI*2);
  ctx.fill();
  drawBarkRing(ctx, outerR, barkPx);
  ctx.restore();

  // Stroke the planar cut face.
  const xHalf = Math.sqrt(Math.max(0, outerR * outerR - yCutPx * yCutPx));
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-xHalf, yCutPx);
  ctx.lineTo(xHalf, yCutPx);
  ctx.stroke();

  ctx.restore();
}

/**
 * v9: Såglistan skiljer på första snitt och senare snitt.
 *
 * Första snittet:
 *   Rund stock ligger mot bädden. Höjd = centrumhöjd + halva blockdimensionen.
 *
 * Senare snitt:
 *   En plan sågad referensyta ligger mot bädden.
 *   Då är höjden från bädd till svärd den färdiga blockdimensionen.
 *
 * För ett 175×175-block blir alltså:
 *   Steg 1: öppningsmått från rundstock
 *   Steg 2+: 175 mm
 */

function supportHeightsForStep(step, block, v) {
  if (!step || !block) return { root: 0, top: 0, average: 0, diff: 0 };

  // Om stocken ligger mot bädden med en plan färdig blockyta är båda stöden lika.
  // Om den fortfarande ligger på rund/osågad stock eller på kvarvarande spill måste
  // rot- och stöd 2 skilja sig när rot-/toppdiameter skiljer sig.
  if (step.supportOnBlockFace) {
    return {
      root: step.bladeToBed,
      top: step.bladeToBed,
      average: step.bladeToBed,
      diff: 0,
    };
  }

  // Skillnad mellan stödens centrumhöjd på grund av taper.
  // Exempel: rot 320 mm, topp 300 mm => centrumhöjd skiljer 10 mm.
  const supportDiff = (v.rootDiameter - v.topDiameter) / 2;

  return {
    root: step.bladeToBed + supportDiff / 2,
    top: step.bladeToBed - supportDiff / 2,
    average: step.bladeToBed,
    diff: supportDiff,
  };
}

function blockMinYAfterRotation(block, rotationValue) {
  const theta = rotationToRadians(rotationValue || 0);
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  const corners = [
    [-block.width / 2, -block.height / 2],
    [ block.width / 2, -block.height / 2],
    [ block.width / 2,  block.height / 2],
    [-block.width / 2,  block.height / 2],
  ];
  return Math.min(...corners.map(([x, y]) => x * sin + y * cos));
}

function planeForSide(side, block) {
  if (side === "top") return { axis: "y", op: ">=", value: -block.height / 2 };
  if (side === "bottom") return { axis: "y", op: "<=", value: block.height / 2 };
  if (side === "right") return { axis: "x", op: "<=", value: block.width / 2 };
  if (side === "left") return { axis: "x", op: ">=", value: -block.width / 2 };
  return null;
}

function rotatedPointY(x, y, rotationValue) {
  const theta = rotationToRadians(rotationValue || 0);
  return x * Math.sin(theta) + y * Math.cos(theta);
}

function blockBottomAfterRotation(block, rotationValue) {
  const corners = [
    [-block.width / 2, -block.height / 2],
    [ block.width / 2, -block.height / 2],
    [ block.width / 2,  block.height / 2],
    [-block.width / 2,  block.height / 2],
  ];
  return Math.max(...corners.map(([x, y]) => rotatedPointY(x, y, rotationValue)));
}

function blockTopAfterRotation(block, rotationValue) {
  const corners = [
    [-block.width / 2, -block.height / 2],
    [ block.width / 2, -block.height / 2],
    [ block.width / 2,  block.height / 2],
    [-block.width / 2,  block.height / 2],
  ];
  return Math.min(...corners.map(([x, y]) => rotatedPointY(x, y, rotationValue)));
}

function completedSidesBeforeStep(sawList, currentStepIndex) {
  const sides = new Set();
  for (let i = 0; i < currentStepIndex; i++) {
    if (sawList[i]?.side) sides.add(sawList[i].side);
  }
  return sides;
}

function downwardBlockFaceSide(rotationValue) {
  // Vilken lokal blockyta hamnar nedåt efter rotation?
  // Vi tar den sida vars normal pekar mest nedåt på skärmen.
  const sides = [
    { side: "top",    nx: 0,  ny: -1 },
    { side: "bottom", nx: 0,  ny:  1 },
    { side: "right",  nx: 1,  ny:  0 },
    { side: "left",   nx: -1, ny:  0 },
  ];
  const theta = rotationToRadians(rotationValue || 0);
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  let best = sides[0];
  let bestY = -Infinity;
  for (const s of sides) {
    const rotatedNormalY = s.nx * sin + s.ny * cos;
    if (rotatedNormalY > bestY) {
      bestY = rotatedNormalY;
      best = s;
    }
  }
  return best.side;
}

function shouldSupportOnBlockFace(block, sawList, currentStepIndex, rotationValue) {
  if (!block || currentStepIndex <= 0) return false;
  const completed = completedSidesBeforeStep(sawList, currentStepIndex);
  const downSide = downwardBlockFaceSide(rotationValue);
  return completed.has(downSide);
}

function supportBottomForStep(block, geom, sawList, currentStepIndex) {
  const stepIndex = window.SawState.getCurrentStepIndex();
  const step = sawList[stepIndex] || sawList[0];
  const rotationValue = step ? step.rotationValue : 0;
  const planes = completedCutPlanes(block, sawList, stepIndex);

  // Om den nedåtriktade blockytan redan är sågad ska blockets plana yta ligga på bädden.
  if (shouldSupportOnBlockFace(block, sawList, currentStepIndex, rotationValue)) {
    return blockBottomAfterRotation(block, rotationValue);
  }

  // Annars vilar kroppen fortfarande på kvarvarande rundstock/spill.
  return retainedShapeBottomAfterRotation(geom.designDiameter / 2, rotationValue, planes, 1);
}

/**
 * v14:
 * Svärdhöjden beräknas inte längre schablonmässigt som "175 mm"
 * för alla snitt efter första.
 *
 * För varje steg:
 * 1. Ta bort tidigare utförda snitt.
 * 2. Rotera hela stock/block-kroppen.
 * 3. Lägg lägsta punkt mot bädden.
 * 4. Placera svärdet vid blockets aktuella övre färdigyta.
 *
 * Det gör att t.ex. ett 90°-steg där stocken fortfarande ligger på rundsida
 * får ett större mått än blockdimensionen. Först när en plan referensyta
 * ligger mot bädden blir måttet lika med blockdimensionen.
 */
