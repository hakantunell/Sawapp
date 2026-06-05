
const $ = (id) => document.getElementById(id);
const mmToIn = (mm) => mm / 25.4;
const fmtMm = (v, d=0) => `${Number(v).toFixed(d)} mm`;
const fmtIn = (v) => `${mmToIn(v).toFixed(2)}"`;

function setupTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tabPage").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const page = document.getElementById(btn.dataset.tab);
      if (page) page.classList.add("active");
    });
  });
}


let currentStepIndex = 0;


let dimensions = [
  { active: true, type: "fixed", width: 190, height: 190, minWidth: 190, wildEdge: false, waneMm: false ? 20 : 0 },
  { active: true, type: "fixed", width: 170, height: 170, minWidth: 170, wildEdge: false, waneMm: false ? 20 : 0 },
  { active: false, type: "fixed", width: 150, height: 150, minWidth: 150, wildEdge: false, waneMm: false ? 20 : 0 },

  { active: false, type: "freeWidth", width: 0, height: 50, minWidth: 0, wildEdge: false, waneMm: false ? 20 : 0 },
  { active: false, type: "freeWidth", width: 0, height: 30, minWidth: 0, wildEdge: false, waneMm: false ? 20 : 0 },

  { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: false, waneMm: false ? 20 : 0 },
  { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: true, waneMm: true ? 20 : 0 },
];

function values() {
  return {
    rootDiameter: +$("rootDiameter").value || 0,
    topDiameter: +$("topDiameter").value || 0,
    rootEndDiameter: $("rootEndDiameter") ? (+$("rootEndDiameter").value || 0) : 0,
    topEndDiameter: $("topEndDiameter") ? (+$("topEndDiameter").value || 0) : 0,
    logLength: +$("logLength").value || 0,
    sweep: +$("sweep").value || 0,
    supportDistance: +$("supportDistance").value || 1,
    bark: +$("bark").value || 0,
    kerf: +$("kerf").value || 0,
    margin: +$("margin").value || 0,
    cornerWane: +$("cornerWane").value || 0,
    profileRadius: +$("profileRadius").value || 0,
  };
}

function computeGeometry(v) {
  const overhangEachEnd = Math.max(0, (v.logLength - v.supportDistance) / 2);

  // v35:
  // rootDiameter/topDiameter-fälten används nu som Diameter stöd 1 / Diameter stöd 2.
  // Rotända/toppända är valfria extra mått. Om de saknas används stödvärdena.
  const support1Diameter = v.rootDiameter;
  const support2Diameter = v.topDiameter;

  let rootEnd = v.rootEndDiameter || 0;
  let topEnd = v.topEndDiameter || 0;

  if (rootEnd > 0 && topEnd > 0) {
    // Mer noggrann modell när ändmått finns.
    // Vi använder den minsta diametern av ändar och stöd som begränsande tvärsnitt.
  } else {
    // Bakåtkompatibelt: stöd 1/stöd 2 antas vara de två stödvärdena.
    const taperPerMm = (support1Diameter - support2Diameter) / Math.max(v.supportDistance, 1);
    rootEnd = support1Diameter + taperPerMm * overhangEachEnd;
    topEnd = support2Diameter - taperPerMm * overhangEachEnd;
  }

  const minEnd = Math.min(
    support1Diameter || Infinity,
    support2Diameter || Infinity,
    rootEnd || Infinity,
    topEnd || Infinity
  );
  const safeMinEnd = Number.isFinite(minEnd) ? minEnd : Math.min(support1Diameter, support2Diameter);
  const designDiameter = Math.max(0, safeMinEnd - 2 * v.sweep);
  const usableDiameter = Math.max(0, designDiameter - 2 * (v.bark + v.margin));
  const avgD = ((support1Diameter + support2Diameter) / 2) || designDiameter;
  const logVolume = Math.PI * Math.pow((avgD/2)/1000,2) * (v.logLength/1000);
  return { overhangEachEnd, taperPerMm: (support1Diameter - support2Diameter) / Math.max(v.supportDistance, 1), rootEnd, topEnd, minEnd: safeMinEnd, designDiameter, usableDiameter, logVolume, support1Diameter, support2Diameter };
}



function dimensionLabel(d) {
  const w = d.waneMm ? ` v${d.waneMm}` : "";
  if (d.type === "freeWidth") return `${d.height} × *${d.wildEdge ? " R" : ""}${w}`;
  if (d.type === "minWidth") return `${d.height} × ${d.minWidth}+${d.wildEdge ? " R" : ""}${w}`;
  return `${d.width} × ${d.height}${d.wildEdge ? " R" : ""}${w}`;
}

function effectiveAllowedWaneForDimension(d, v) {
  // v28: vankant är per dimension.
  // Anges som mm in från hörnet längs båda kanterna, räknas om till diagonalpåslag.
  const perDimension = (d.waneMm || 0) * Math.SQRT2;

  // Profilradie är fortfarande global hjälp, men används bara om den ger större tillåtelse.
  const fromProfile = (v.profileRadius || 0) * 0.4;

  // Vildmarkspanel får ett praktiskt standardvärde om fältet är 0.
  const wildDefault = d.wildEdge ? 20 * Math.SQRT2 : 0;

  return Math.max(perDimension, fromProfile, wildDefault);
}

function maxFreeWidthForThickness(thickness, geom, allowedWane) {
  const availableDiag = geom.usableDiameter + 2 * allowedWane;
  return Math.floor(Math.sqrt(Math.max(0, availableDiag * availableDiag - thickness * thickness)));
}

function resolveDimensionCandidate(d, geom, v) {
  const allowedWane = effectiveAllowedWaneForDimension(d, v);

  if (d.type === "freeWidth") {
    const thickness = d.height;
    const computedWidth = maxFreeWidthForThickness(thickness, geom, allowedWane);
    if (computedWidth <= 0) return null;
    return {
      ...d,
      width: computedWidth,
      height: thickness,
      computedWidth,
      allowedWane,
      diagonal: Math.hypot(computedWidth, thickness),
      requiredDiagonal: requiredDiagonalWithWane(computedWidth, thickness, allowedWane),
      resolvedLabel: `${thickness} × ${computedWidth}${d.wildEdge ? " R" : ""}`,
    };
  }

  if (d.type === "minWidth") {
    const thickness = d.height;
    const minWidth = d.minWidth || d.width || 0;
    const computedWidth = maxFreeWidthForThickness(thickness, geom, allowedWane);
    if (computedWidth < minWidth) return null;
    return {
      ...d,
      width: computedWidth,
      height: thickness,
      minWidth,
      computedWidth,
      allowedWane,
      diagonal: Math.hypot(computedWidth, thickness),
      requiredDiagonal: requiredDiagonalWithWane(computedWidth, thickness, allowedWane),
      resolvedLabel: `${thickness} × ${computedWidth}${d.wildEdge ? " R" : ""}`,
    };
  }

  const requiredDiagonal = requiredDiagonalWithWane(d.width, d.height, allowedWane);
  if (requiredDiagonal > geom.usableDiameter + 0.5) return null;
  return {
    ...d,
    allowedWane,
    diagonal: Math.hypot(d.width, d.height),
    requiredDiagonal,
    resolvedLabel: `${d.width} × ${d.height}${d.wildEdge ? " R" : ""}`,
  };
}

function effectiveCornerWane(v) {
  // Profilfräsning tar normalt bort en del av hörnen. 0,4 × radie är en försiktig approximation.
  // Exempel: profilradie 25 mm ger ca 10 mm tillåten hörnvankant.
  return Math.max((v.cornerWane || 0) * Math.SQRT2, (v.profileRadius || 0) * 0.4);
}

function requiredDiagonalWithWane(width, height, allowedCornerWane) {
  // Förenklad modell:
  // En fyrkant kräver diagonal sqrt(w²+h²).
  // Om hörnen får ha vankant reduceras kravet med 2×tillåten hörnvankant.
  return Math.max(0, Math.hypot(width, height) - 2 * allowedCornerWane);
}

function findBestCenterBlock(geom, v) {
  const mode = $("optimizationMode") ? $("optimizationMode").value : "mixed";
  let active = dimensions.filter(d => d.active);

  if (mode === "timber") active = active.filter(d => d.type === "fixed");
  if (mode === "plank") active = active.filter(d => d.type === "freeWidth");
  if (mode === "panel") active = active.filter(d => d.type === "minWidth" || d.wildEdge);

  for (const d of active) {
    const candidate = resolveDimensionCandidate(d, geom, v);
    if (candidate) return { ...candidate, resultType: candidate.type || "fixed" };
  }
  return null;
}

function getRotationSequence() {
  const preset = $("rotationPreset").value;
  if (preset === "opposite-first") return [0, 180, 90, 270];
  if (preset === "manual") {
    const seq = $("manualRotation").value.split(",").map(s => Number(s.trim())).filter(Number.isFinite);
    return seq.length ? seq : [0, 90, 180, 270];
  }
  return [0, 90, 180, 270];
}

function sideForRotation(rot) {
  const norm = ((rot % 360) + 360) % 360;
  if (norm === 0) return "top";
  if (norm === 180) return "bottom";
  if (norm === 90) return "right";
  if (norm === 270) return "left";
  return "top";
}


function rotationToRadians(rotationValue) {
  // v16:
  // Rotationsordningen i såglistan beskriver hur stocken vrids på sågen:
  // 90° betyder att höger sida hamnar upp mot svärdet,
  // 270° betyder att vänster sida hamnar upp mot svärdet.
  //
  // Canvas positiva rotation går åt andra hållet för vår koordinatmodell.
  // Därför används negativ vinkel i alla fysiska rotationsberäkningar.
  return -(rotationValue || 0) * Math.PI / 180;
}

/**
 * Ritar stocken i den orientering den faktiskt har efter rotation.
 *
 * - Steg 1: hel rundstock.
 * - Efterföljande steg: den sida som sågades i steg 1 är borta.
 * - Stocken roteras så att vald sida hamnar mot bädden.
 *
 * I praktiken innebär det att den plana referensytan ligger nedåt mot bädden
 * efter 180°-vändningen, inte uppåt som i v10.
 */
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
  const step = sawList[currentStepIndex] || sawList[0];
  const rotationValue = step ? step.rotationValue : 0;
  const planes = completedCutPlanes(block, sawList, currentStepIndex);

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
function buildSawList(block, geom, v) {
  if (!block) return [];
  const rotations = getRotationSequence();
  const sawList = [];

  for (let idx = 0; idx < rotations.length; idx++) {
    const rot = rotations[idx];
    const rotationValue = ((rot % 360) + 360) % 360;
    const side = sideForRotation(rot);

    // Temporär lista med tidigare snitt används för att avgöra supportläge.
    const tempList = sawList.slice();
    const planes = completedCutPlanes(block, tempList, tempList.length);

    let supportBottom;
    if (shouldSupportOnBlockFace(block, tempList, tempList.length, rotationValue)) {
      supportBottom = blockBottomAfterRotation(block, rotationValue);
    } else {
      supportBottom = retainedShapeBottomAfterRotation(geom.designDiameter / 2, rotationValue, planes, 1);
    }

    const blockTop = blockTopAfterRotation(block, rotationValue);
    const bladeToBed = supportBottom - blockTop;

    const names = {
      top: "Övre sida",
      bottom: "Nedre sida",
      right: "Höger sida",
      left: "Vänster sida",
    };

    const downSide = downwardBlockFaceSide(rotationValue);
    const completed = completedSidesBeforeStep(tempList, tempList.length);
    const supportOnBlockFace = completed.has(downSide);
    const supportMode = supportOnBlockFace
      ? "Plan blockyta mot bädd"
      : (idx === 0 ? "Rundstock mot bädd" : "Kvarvarande rundstock/spill mot bädd");

    const step = {
      step: idx + 1,
      rotationValue,
      rotation: `${rot}°`,
      side,
      cut: names[side],
      isFirstCut: idx === 0,
      reference: supportMode,
      supportOnBlockFace,
      bladeToBed,
      bladeToBedIn: mmToIn(bladeToBed),
      finishedMeasure: side === "top" || side === "bottom" ? block.height : block.width,
      note: idx === 0
        ? "Första snittet skapar plan referensyta"
        : "Höjd beräknad från faktisk stödpunkt efter rotation",
    };

    const heights = supportHeightsForStep(step, block, v);
    step.rootSupportHeight = heights.root;
    step.topSupportHeight = heights.top;
    step.supportHeightAverage = heights.average;
    step.supportHeightDiff = heights.diff;
    sawList.push(step);
  }

  return sawList;
}


function activeSideYieldDimensions() {
  return dimensions.filter(d => d.active && (d.type === "freeWidth" || d.type === "minWidth" || d.wildEdge));
}


function activePackingDimensions() {
  return dimensions
    .filter(d => d.active)
    .map((d, index) => ({ ...d, priorityIndex: index }))
    .filter(d => {
      if (d.type === "fixed") return d.width > 0 && d.height > 0;
      if (d.type === "freeWidth") return d.height > 0;
      if (d.type === "minWidth") return d.height > 0 && (d.minWidth || d.width || 0) > 0;
      return false;
    });
}

function circleWidthAtY(y, R) {
  if (Math.abs(y) > R) return 0;
  return 2 * Math.sqrt(Math.max(0, R * R - y * y));
}

function dimensionToPackCandidate(d, geom, v) {
  const allowedWane = effectiveAllowedWaneForDimension(d, v);
  if (d.type === "fixed") {
    return { source: d, w: d.width, h: d.height, label: `${d.width}×${d.height}${d.wildEdge ? " R" : ""}`, allowedWane, type: d.type, priorityIndex: d.priorityIndex };
  }
  if (d.type === "freeWidth") {
    return { source: d, w: Math.floor(geom.usableDiameter), h: d.height, label: `${d.height}×*${d.wildEdge ? " R" : ""}`, allowedWane, type: d.type, priorityIndex: d.priorityIndex, freeWidth: true, minWidth: 1 };
  }
  if (d.type === "minWidth") {
    const minWidth = d.minWidth || d.width || 0;
    return { source: d, w: Math.floor(geom.usableDiameter), h: d.height, label: `${d.height}×${minWidth}+${d.wildEdge ? " R" : ""}`, allowedWane, type: d.type, priorityIndex: d.priorityIndex, freeWidth: true, minWidth };
  }
  return null;
}

function rectFitsCircle(rect, R, allowedWane = 0) {
  const corners = [[rect.x, rect.y], [rect.x+rect.w, rect.y], [rect.x, rect.y+rect.h], [rect.x+rect.w, rect.y+rect.h]];
  const allowedR = R + allowedWane;
  return corners.every(([x,y]) => Math.hypot(x,y) <= allowedR + 0.001);
}

function computeSawmillPacking(geom, v) {
  const R = geom.usableDiameter / 2;
  const dims = activePackingDimensions();
  const placed = [];
  if (!dims.length || R <= 0) return placed;

  const kerf = v.kerf || 0;

  // 1. Välj första fasta/fyrkantiga dimension som centrumblock enligt prioritet.
  let center = null;
  for (const d of dims) {
    if (d.type !== "fixed") continue;
    const allowedWane = effectiveAllowedWaneForDimension(d, v);
    const rect = { x: -d.width/2, y: -d.height/2, w: d.width, h: d.height };
    if (rectFitsCircle(rect, R, allowedWane)) {
      center = {
        ...rect,
        label: `${d.width}×${d.height}${d.wildEdge ? " R" : ""}`,
        type: "center",
        wildEdge: !!d.wildEdge,
        priorityIndex: d.priorityIndex,
        thickness: d.height,
      };
      placed.push(center);
      break;
    }
  }

  // Om inget centrumblock får plats: fall tillbaka till hyll-packning.
  if (!center) {
    let cursorY = -R;
    let shelfNo = 0;
    const candidates = dims.map(d => dimensionToPackCandidate(d, geom, v)).filter(Boolean);
    while (cursorY < R - 1 && shelfNo < 60) {
      let placedInShelf = false;
      for (const cand of candidates) {
        const shelfH = cand.h;
        if (cursorY + shelfH > R) continue;
        const midY = cursorY + shelfH / 2;
        let availW = circleWidthAtY(midY, R) - 2 * kerf;
        if (availW <= 0) continue;
        let itemW = cand.freeWidth ? Math.floor(availW) : cand.w;
        if (cand.freeWidth && itemW < cand.minWidth) continue;
        if (!cand.freeWidth && itemW > availW) continue;
        let rect = { x: -itemW/2, y: cursorY, w: itemW, h: shelfH };
        while (itemW > (cand.minWidth || 1) && !rectFitsCircle(rect, R, cand.allowedWane)) {
          itemW -= 2;
          rect = { x: -itemW/2, y: cursorY, w: itemW, h: shelfH };
        }
        if (!rectFitsCircle(rect, R, cand.allowedWane)) continue;
        placed.push({ ...rect, label: cand.freeWidth ? `${cand.h}×${itemW}${cand.source.wildEdge ? " R" : ""}` : cand.label, type: cand.type, wildEdge: !!cand.source.wildEdge, priorityIndex: cand.priorityIndex, shelfNo });
        cursorY += shelfH + kerf;
        shelfNo++;
        placedInShelf = true;
        break;
      }
      if (!placedInShelf) cursorY += 5;
    }
    return placed;
  }

  // 2. Använd övriga aktiva plank/panel-dimensioner som sidobitar.
  const sideDims = dims
    .filter(d => d.type === "freeWidth" || d.type === "minWidth" || d.wildEdge)
    .map(d => dimensionToPackCandidate(d, geom, v))
    .filter(Boolean);

  const sides = [
    { name: "över", side: "top", horizontal: true, x: -center.w/2, y: -center.h/2, length: center.w, outward: -1 },
    { name: "under", side: "bottom", horizontal: true, x: -center.w/2, y: center.h/2, length: center.w, outward: 1 },
    { name: "höger", side: "right", horizontal: false, x: center.w/2, y: -center.h/2, length: center.h, outward: 1 },
    { name: "vänster", side: "left", horizontal: false, x: -center.w/2, y: -center.h/2, length: center.h, outward: -1 },
  ];

  for (const side of sides) {
    let chosen = null;

    for (const cand of sideDims) {
      const t = cand.h;
      let rect;
      if (side.horizontal) {
        const y = side.outward < 0 ? side.y - kerf - t : side.y + kerf;
        const yOuter = side.outward < 0 ? y : y + t;
        const maxWidthAtOuter = circleWidthAtY(yOuter, R + cand.allowedWane);
        let w = cand.freeWidth ? Math.min(side.length, Math.floor(maxWidthAtOuter)) : cand.w;
        if (cand.freeWidth && w < (cand.minWidth || 1)) continue;
        if (!cand.freeWidth && w > side.length + 0.001) continue;
        rect = { x: -w/2, y, w, h: t };
      } else {
        const x = side.outward < 0 ? side.x - kerf - t : side.x + kerf;
        const xOuter = side.outward < 0 ? x : x + t;
        if (Math.abs(xOuter) > R + cand.allowedWane) continue;
        const maxH = 2 * Math.sqrt(Math.max(0, (R + cand.allowedWane)**2 - xOuter*xOuter));
        let h = cand.freeWidth ? Math.min(side.length, Math.floor(maxH)) : cand.w;
        if (cand.freeWidth && h < (cand.minWidth || 1)) continue;
        if (!cand.freeWidth && h > side.length + 0.001) continue;
        rect = { x, y: -h/2, w: t, h };
      }

      if (!rectFitsCircle(rect, R, cand.allowedWane)) {
        // Trimma fri bredd tills den passar.
        if (!cand.freeWidth) continue;
        if (side.horizontal) {
          while (rect.w > (cand.minWidth || 1) && !rectFitsCircle(rect, R, cand.allowedWane)) {
            rect.w -= 2;
            rect.x = -rect.w/2;
          }
        } else {
          while (rect.h > (cand.minWidth || 1) && !rectFitsCircle(rect, R, cand.allowedWane)) {
            rect.h -= 2;
            rect.y = -rect.h/2;
          }
        }
      }

      if (!rectFitsCircle(rect, R, cand.allowedWane)) continue;

      chosen = {
        ...rect,
        label: side.horizontal
          ? `${cand.h}×${Math.round(rect.w)}${cand.source.wildEdge ? " R" : ""}`
          : `${cand.h}×${Math.round(rect.h)}${cand.source.wildEdge ? " R" : ""}`,
        type: cand.type,
        wildEdge: !!cand.source.wildEdge,
        priorityIndex: cand.priorityIndex,
        side: side.name,
      };
      break;
    }

    if (chosen) placed.push(chosen);
  }

  return placed;
}

function renderPackingResult(packing) {
  const el = $("sideYield");
  if (!el) return;
  if (!packing || !packing.length) {
    el.innerHTML = `<div class="status-bad">Ingen sågverkslayout hittades för aktiva dimensioner.</div>`;
    return;
  }
  const area = packing.reduce((sum, r) => sum + r.w * r.h / 1e6, 0);
  el.innerHTML = `
    <div class="status-ok">
      Sågverkslayout: <strong>${packing.length}</strong> bitar, area <strong>${area.toFixed(3)} m²</strong>.
      <br><span class="hint">Förenklad prioritetspackning. Sågplanen frigör sidobitar först och blockar kärnan sist.</span>
    </div>
    <div class="sideYieldGrid">
      ${packing.map((r, i) => `
        <div class="sideYieldCard">
          <strong>${i + 1}. ${r.label}</strong>
          <span>${Math.round(r.w)} × ${Math.round(r.h)} mm</span>
          <small>${r.wildEdge ? "vildmark/råkant tillåten" : "ren dimension"} · prioritet ${r.priorityIndex + 1}</small>
        </div>
      `).join("")}
    </div>
  `;
}
function computeSideYield(block, geom, v) {
  if (!block) return [];

  // Förenklad modell för sidoutbyte:
  // Efter att centrumblocket är valt tittar vi på sidoutrymmet utanför blockets fyra sidor.
  // För varje sida beräknas största möjliga "bredd" utifrån cirkelns chord vid blockytan.
  // Detta är inte en full sågoptimerare ännu, men ger praktiskt besked om ungefärliga sidobrädor.
  const sideDims = activeSideYieldDimensions();
  if (!sideDims.length) return [];

  const R = geom.usableDiameter / 2;
  const candidates = [];
  const sides = [
    { name: "övre sida", orientation: "horizontal", y: -block.height / 2 },
    { name: "nedre sida", orientation: "horizontal", y: block.height / 2 },
    { name: "höger sida", orientation: "vertical", x: block.width / 2 },
    { name: "vänster sida", orientation: "vertical", x: -block.width / 2 },
  ];

  for (const side of sides) {
    for (const d of sideDims) {
      const thickness = d.height || 0;
      if (thickness <= 0) continue;

      let availableLength = 0;
      let availableDepth = 0;

      if (side.orientation === "horizontal") {
        const yOuter = side.y < 0 ? side.y - thickness : side.y + thickness;
        const yCheck = Math.abs(yOuter);
        if (yCheck > R) continue;
        availableLength = 2 * Math.sqrt(Math.max(0, R * R - yCheck * yCheck));
        availableDepth = Math.max(0, R - Math.abs(side.y));
      } else {
        const xOuter = side.x < 0 ? side.x - thickness : side.x + thickness;
        const xCheck = Math.abs(xOuter);
        if (xCheck > R) continue;
        availableLength = 2 * Math.sqrt(Math.max(0, R * R - xCheck * xCheck));
        availableDepth = Math.max(0, R - Math.abs(side.x));
      }

      // Fri bredd: använd tillgänglig längd som bredd.
      // Minbredd: underkänn om tillgänglig längd understiger minbredd.
      const width = Math.floor(availableLength);
      const minWidth = d.type === "minWidth" ? (d.minWidth || d.width || 0) : 0;
      if (minWidth && width < minWidth) continue;

      // Vildmarkspanel kan accepteras med råkant. För icke-vildmark kräver vi lite marginal.
      const edgeNote = d.wildEdge ? "råkant/vankant tillåten" : "renare kant";
      const label = d.type === "minWidth"
        ? `${thickness} × ${width} mm (${minWidth}+${d.wildEdge ? " R" : ""})`
        : `${thickness} × ${width} mm${d.wildEdge ? " R" : ""}`;

      candidates.push({
        side: side.name,
        thickness,
        width,
        minWidth,
        wildEdge: !!d.wildEdge,
        label,
        edgeNote,
        availableDepth: Math.floor(availableDepth),
      });
    }
  }

  // Enkelt urval: prioritetsordning i dimensionslistan + max en per sida.
  const selected = [];
  const usedSides = new Set();
  for (const d of sideDims) {
    const matching = candidates
      .filter(c => !usedSides.has(c.side) && c.thickness === d.height && c.wildEdge === !!d.wildEdge)
      .sort((a, b) => b.width - a.width);
    if (matching[0]) {
      selected.push(matching[0]);
      usedSides.add(matching[0].side);
    }
  }

  return selected;
}

function renderSideYield(sideYield) {
  const el = $("sideYield");
  if (!el) return;
  if (!sideYield || !sideYield.length) {
    el.innerHTML = `<div class="status-bad">Inget sidoutbyte beräknat. Aktivera Fri bredd/Minbredd/Vildmark i dimensionslistan.</div>`;
    return;
  }
  el.innerHTML = `
    <div class="sideYieldGrid">
      ${sideYield.map(s => `
        <div class="sideYieldCard">
          <strong>${s.side}</strong>
          <span>${s.label}</span>
          <small>${s.edgeNote}. Sidodjup ca ${s.availableDepth} mm.</small>
        </div>
      `).join("")}
    </div>
  `;
}


function sideToRotation(side) {
  if (side === "top" || side === "över") return 0;
  if (side === "bottom" || side === "under") return 180;
  if (side === "right" || side === "höger") return 90;
  if (side === "left" || side === "vänster") return 270;
  return 0;
}

function inferPackingSide(piece) {
  if (piece.type === "center") return "center";
  if (piece.side) {
    if (piece.side === "över") return "top";
    if (piece.side === "under") return "bottom";
    if (piece.side === "höger") return "right";
    if (piece.side === "vänster") return "left";
    return piece.side;
  }
  // fallback from coordinates
  const cx = piece.x + piece.w / 2;
  const cy = piece.y + piece.h / 2;
  if (Math.abs(cx) > Math.abs(cy)) return cx > 0 ? "right" : "left";
  return cy > 0 ? "bottom" : "top";
}


function completedPackingSources(plan, stepIndex) {
  const set = new Set();
  if (!plan) return set;
  for (let i = 0; i < stepIndex; i++) {
    const s = plan[i];
    if (s && s.kind === "side" && s.source) set.add(s.source);
  }
  return set;
}

function remainingPackingPieces(packingLayout, plan, stepIndex) {
  const done = completedPackingSources(plan, stepIndex);
  return (packingLayout || []).filter(p => !done.has(p));
}

function packingSupportBottomY(pieces, rotationValue) {
  if (!pieces || !pieces.length) return 0;
  const theta = rotationToRadians(rotationValue || 0);
  let maxY = -Infinity;
  for (const r of pieces) {
    const b = rotatedRectBounds(r, theta);
    maxY = Math.max(maxY, b.maxY);
  }
  return Number.isFinite(maxY) ? maxY : 0;
}

function packingBladeYForStep(step) {
  if (!step || !step.source) return 0;
  const theta = rotationToRadians(step.rotationValue || 0);
  const b = rotatedRectBounds(step.source, theta);

  if (step.kind === "slab") {
    // Yttersnittet ligger på plankans utsida, alltså översta kanten efter rotation.
    return b.minY;
  }

  if (step.kind === "side") {
    // Planksnittet ligger på plankans insida, alltså nedre kanten efter samma rotation.
    return b.maxY;
  }

  if (step.side === "bottom") return b.maxY;
  return b.minY;
}

function recalcSawmillPlanHeights(plan, packingLayout, v) {
  if (!plan || !packingLayout) return plan;
  const taperDiff = (v.rootDiameter - v.topDiameter) / 2;

  plan.forEach((step, idx) => {
    const remaining = remainingPackingPieces(packingLayout, plan, idx);
    const supportBottom = remainingPackingBoundsWithSlabCuts(packingLayout, plan, idx, step.rotationValue || 0);
    const bladeY = packingBladeYForStep(step);
    const h = Math.max(0, supportBottom - bladeY);

    step.bladeToBed = h;

    // För första snittet ligger stocken på rundsida och stöden påverkas av avsmalningen.
    // Efter att en sidobit/planka är frigjord antar vi i första hand plan sågyta/referensyta.
    if (idx === 0) {
      step.rootSupportHeight = h + taperDiff / 2;
      step.topSupportHeight = h - taperDiff / 2;
    } else {
      step.rootSupportHeight = h;
      step.topSupportHeight = h;
    }
  });

  return plan;
}

function buildSawmillCutPlan(packingLayout, block, geom, v) {
  if (!packingLayout || !packingLayout.length) return [];

  const sidePieces = packingLayout
    .filter(p => p.type !== "center")
    .map((p, i) => {
      const side = inferPackingSide(p);
      const thickness = Math.min(p.w, p.h);
      const length = Math.max(p.w, p.h);
      return {
        side,
        rotationValue: sideToRotation(side),
        rotation: `${sideToRotation(side)}°`,
        label: p.label || `${Math.round(thickness)}×${Math.round(length)}`,
        thickness,
        length,
        source: p,
      };
    });

  const sideOrder = { top: 0, bottom: 1, right: 2, left: 3 };
  sidePieces.sort((a, b) => (sideOrder[a.side] ?? 9) - (sideOrder[b.side] ?? 9));

  const steps = [];

  // Varje sidobit kräver två snitt:
  // 1) ta bort ytterdel/slabba
  // 2) utan rotation: såga loss plankan/sidobiten
  sidePieces.forEach((p) => {
    steps.push({
      kind: "slab",
      side: p.side,
      rotationValue: p.rotationValue,
      rotation: p.rotation,
      label: `ytterdel före ${p.label}`,
      thickness: p.thickness,
      length: p.length,
      note: "Ta bort ytterdelen/slabban först",
      source: p.source,
      cutPhase: "outer",
    });
    steps.push({
      kind: "side",
      side: p.side,
      rotationValue: p.rotationValue,
      rotation: p.rotation,
      label: p.label,
      thickness: p.thickness,
      length: p.length,
      note: "Utan rotation: såga loss plankan/sidobiten",
      source: p.source,
      cutPhase: "inner",
    });
  });

  const centerPiece = packingLayout.find(p => p.type === "center");
  const core = centerPiece || (block ? { x: -block.width/2, y: -block.height/2, w: block.width, h: block.height, label: `${block.width}×${block.height}` } : null);

  if (core) {
    const label = core.label || `${Math.round(core.w)}×${Math.round(core.h)}`;
    [
      { side: "top", rotationValue: 0, text: "övre sida" },
      { side: "bottom", rotationValue: 180, text: "nedre sida" },
      { side: "right", rotationValue: 90, text: "höger sida" },
      { side: "left", rotationValue: 270, text: "vänster sida" },
    ].forEach((s) => {
      steps.push({
        kind: "center",
        side: s.side,
        rotationValue: s.rotationValue,
        rotation: `${s.rotationValue}°`,
        label,
        thickness: s.side === "top" || s.side === "bottom" ? core.h : core.w,
        length: s.side === "top" || s.side === "bottom" ? core.w : core.h,
        rootSupportHeight: null,
        topSupportHeight: null,
        note: `Blocka kärnan sist – ${s.text}`,
        source: core,
      });
    });
  }

  steps.forEach((s, idx) => { s.step = idx + 1; });
  return recalcSawmillPlanHeights(steps, packingLayout, v);
}

function renderSawmillCutPlan(plan) {
  const table = $("sawListTable");
  if (!table) return false;
  const tbody = table.querySelector("tbody");
  if (!tbody) return false;

  if (!plan || !plan.length) return false;

  tbody.innerHTML = "";
  for (const s of plan) {
    const tr = document.createElement("tr");
    tr.className = (s.step - 1) === currentStepIndex ? "selected-step" : "";
    const action =
      s.kind === "slab" ? "Ta bort ytterdel" :
      s.kind === "side" ? "Frigör " + s.label :
      "Blocka " + s.label;
    const ref =
      s.kind === "slab" ? "Yttersnitt" :
      s.kind === "side" ? "Planksnitt utan rotation" :
      "Kärna sist";

    tr.innerHTML = `
      <td>${s.step}</td>
      <td>${s.rotation}</td>
      <td>${action}</td>
      <td>${ref}</td>
      <td><strong>${s.rootSupportHeight.toFixed(0)} mm</strong></td>
      <td><strong>${s.topSupportHeight.toFixed(0)} mm</strong></td>
      <td><strong>${fmtIn(s.rootSupportHeight)} / ${fmtIn(s.topSupportHeight)}</strong></td>
      <td>${s.note}</td>
    `;
    tr.onclick = () => { currentStepIndex = s.step - 1; update(); };
    tbody.appendChild(tr);
  }

  return true;
}

function renderDimensions() {
  const list = $("dimensionList");
  list.innerHTML = "";
  dimensions.forEach((d, i) => {
    const row = document.createElement("div");
    row.className = "dimension-row dimension-row-v22";
    row.innerHTML = `
      <div>${i+1}</div>
      <button title="Flytta upp" ${i===0?"disabled":""}>↑</button>
      <button title="Flytta ner" ${i===dimensions.length-1?"disabled":""}>↓</button>
      <input type="checkbox" ${d.active ? "checked": ""} title="Aktiv">
      <select class="dim-type">
        <option value="fixed" ${d.type === "fixed" ? "selected" : ""}>Fyrkant</option>
        <option value="freeWidth" ${d.type === "freeWidth" ? "selected" : ""}>Fri bredd</option>
        <option value="minWidth" ${d.type === "minWidth" ? "selected" : ""}>Minbredd</option>
      </select>
      <input class="dim-height" type="number" value="${d.height}" step="1" title="Höjd/tjocklek">
      <input class="dim-width" type="number" value="${d.type === "minWidth" ? (d.minWidth || d.width || 0) : (d.width || 0)}" step="1" title="Bredd/minbredd">
      <input class="dim-wane" type="number" value="${d.waneMm || 0}" step="1" title="Tillåten vankant per dimension, mm">
      <label class="wild-label"><input class="wild-edge" type="checkbox" ${d.wildEdge ? "checked" : ""}> Vildmark</label>
      <div class="area">${dimensionLabel(d)}</div>
    `;

    const [up, down] = row.querySelectorAll("button");
    const activeBox = row.querySelector('input[type="checkbox"]');
    const typeSel = row.querySelector(".dim-type");
    const heightInput = row.querySelector(".dim-height");
    const widthInput = row.querySelector(".dim-width");
    const waneInput = row.querySelector(".dim-wane");
    const wildBox = row.querySelector(".wild-edge");

    up.onclick = () => { [dimensions[i-1], dimensions[i]] = [dimensions[i], dimensions[i-1]]; currentStepIndex = 0; update(); };
    down.onclick = () => { [dimensions[i+1], dimensions[i]] = [dimensions[i], dimensions[i+1]]; currentStepIndex = 0; update(); };
    activeBox.onchange = () => { d.active = activeBox.checked; currentStepIndex = 0; update(); };
    typeSel.onchange = () => {
      d.type = typeSel.value;
      if (d.type === "freeWidth") d.width = 0;
      if (d.type === "minWidth") d.minWidth = d.minWidth || d.width || 100;
      currentStepIndex = 0;
      update();
    };
    heightInput.onchange = () => { d.height = +heightInput.value || 0; currentStepIndex = 0; update(); };
    widthInput.onchange = () => {
      const val = +widthInput.value || 0;
      if (d.type === "minWidth") d.minWidth = val;
      else d.width = val;
      currentStepIndex = 0;
      update();
    };
    waneInput.onchange = () => { d.waneMm = +waneInput.value || 0; currentStepIndex = 0; update(); };
    wildBox.onchange = () => {
      d.wildEdge = wildBox.checked;
      if (d.wildEdge && !d.waneMm) d.waneMm = 20;
      currentStepIndex = 0;
      update();
    };

    list.appendChild(row);
  });
}

function drawBarkRing(ctx, outerR, barkThicknessPx) {
  const innerR = Math.max(0, outerR - barkThicknessPx);
  ctx.save();
  ctx.fillStyle = "#7c5a3a";
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
  ctx.fill("evenodd");
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#5b3d24";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCutLogShape(ctx, outerR, barkPx, bottomY, topCutY) {
  // Delvis blockad stock efter första snittet:
  // - rund underdel kvar
  // - plan kapad ovansida
  // - bark finns bara längs kvarvarande rund ytterkontur
  const y = Math.max(-outerR, Math.min(outerR, topCutY));
  const x = Math.sqrt(Math.max(0, outerR * outerR - y * y));

  ctx.save();

  // Kvarvarande träyta: cirkelsegment under den plana snittytan
  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.moveTo(-x, y);
  ctx.lineTo(x, y);
  ctx.arc(0, 0, outerR, Math.asin(y / outerR), Math.PI - Math.asin(y / outerR), false);
  ctx.closePath();
  ctx.fill();

  // Bark som bara följer den kvarvarande rundade ytterkonturen
  const innerR = Math.max(0, outerR - barkPx);
  const thetaRight = Math.asin(y / outerR);
  const thetaLeft = Math.PI - thetaRight;

  ctx.strokeStyle = "#7c5a3a";
  ctx.lineWidth = Math.max(2, barkPx);
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0, outerR - barkPx / 2), thetaRight, thetaLeft, false);
  ctx.stroke();

  // Yttre kontur + plan snittyta
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-x, y);
  ctx.lineTo(x, y);
  ctx.arc(0, 0, outerR, thetaRight, thetaLeft, false);
  ctx.closePath();
  ctx.stroke();

  // Plan referens-/snittyta markeras lätt
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-x, y);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.restore();
}

function renderTimberCanvas(block, geom, v, sawList) {
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

  const step = sawList[currentStepIndex] || sawList[0];
  const theta = step && !step.isFirstCut ? rotationToRadians(step.rotationValue) : 0;
  const planes = completedCutPlanes(block, sawList, currentStepIndex);

  // v15:
  // Om en redan sågad blockyta ligger nedåt efter rotation, ska den plana blockytan
  // ligga på bädden. Annars vilar stocken på kvarvarande rundstock/spill.
  const bedY = outerR;
  let bottomLocal;
  if (shouldSupportOnBlockFace(block, sawList, currentStepIndex, step ? step.rotationValue : 0)) {
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


function rotatePoint(x, y, theta) {
  return {
    x: x * Math.cos(theta) - y * Math.sin(theta),
    y: x * Math.sin(theta) + y * Math.cos(theta),
  };
}

function rotatedRectBounds(r, theta) {
  const pts = [
    rotatePoint(r.x, r.y, theta),
    rotatePoint(r.x + r.w, r.y, theta),
    rotatePoint(r.x, r.y + r.h, theta),
    rotatePoint(r.x + r.w, r.y + r.h, theta),
  ];
  return {
    minX: Math.min(...pts.map(p => p.x)),
    maxX: Math.max(...pts.map(p => p.x)),
    minY: Math.min(...pts.map(p => p.y)),
    maxY: Math.max(...pts.map(p => p.y)),
    pts,
  };
}


function slabCutBoundaryForStep(step) {
  if (!step || !step.source || (step.kind !== "side" && step.kind !== "slab")) return null;
  const r = step.source;
  const phase = step.cutPhase || (step.kind === "slab" ? "outer" : "inner");

  // phase outer = första snittet som tar bort bark-/ytterdelen fram till plankans utsida.
  // phase inner = andra snittet, utan rotation, som frigör själva plankan.
  if (step.side === "top") {
    return phase === "outer"
      ? { axis: "y", op: ">=", value: r.y }
      : { axis: "y", op: ">=", value: r.y + r.h };
  }
  if (step.side === "bottom") {
    return phase === "outer"
      ? { axis: "y", op: "<=", value: r.y + r.h }
      : { axis: "y", op: "<=", value: r.y };
  }
  if (step.side === "right") {
    return phase === "outer"
      ? { axis: "x", op: "<=", value: r.x + r.w }
      : { axis: "x", op: "<=", value: r.x };
  }
  if (step.side === "left") {
    return phase === "outer"
      ? { axis: "x", op: ">=", value: r.x }
      : { axis: "x", op: ">=", value: r.x + r.w };
  }
  return null;
}

function completedSlabCuts(plan, stepIndex) {
  const cuts = [];
  if (!plan) return cuts;
  for (let i = 0; i < stepIndex; i++) {
    const c = slabCutBoundaryForStep(plan[i]);
    if (c) cuts.push(c);
  }
  return cuts;
}

function pointKeptBySlabCuts(x, y, cuts) {
  for (const c of cuts) {
    if (c.axis === "y") {
      if (c.op === ">=" && y < c.value - 0.001) return false;
      if (c.op === "<=" && y > c.value + 0.001) return false;
    } else {
      if (c.op === ">=" && x < c.value - 0.001) return false;
      if (c.op === "<=" && x > c.value + 0.001) return false;
    }
  }
  return true;
}

function drawRemovedSlabs(ctx, cuts, R, scale) {
  // Ritar över bortsågad ytterzon i lokal, redan roterad kropp.
  ctx.save();
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;

  for (const c of cuts) {
    const v = c.value * scale;
    ctx.beginPath();
    if (c.axis === "y" && c.op === ">=") {
      ctx.rect(-R - 80, -R - 80, 2*(R+80), v + R + 80);
    } else if (c.axis === "y" && c.op === "<=") {
      ctx.rect(-R - 80, v, 2*(R+80), R + 80 - v);
    } else if (c.axis === "x" && c.op === ">=") {
      ctx.rect(-R - 80, -R - 80, v + R + 80, 2*(R+80));
    } else if (c.axis === "x" && c.op === "<=") {
      ctx.rect(v, -R - 80, R + 80 - v, 2*(R+80));
    }
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function remainingPackingBoundsWithSlabCuts(packingLayout, plan, stepIndex, rotationValue) {
  const cuts = completedSlabCuts(plan, stepIndex);
  const theta = rotationToRadians(rotationValue || 0);
  let maxY = -Infinity;

  for (const r of (packingLayout || [])) {
    // Hoppa över bitar som ligger utanför tidigare slabbsnitt.
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    if (!pointKeptBySlabCuts(cx, cy, cuts)) continue;

    const b = rotatedRectBounds(r, theta);
    maxY = Math.max(maxY, b.maxY);
  }

  return Number.isFinite(maxY) ? maxY : 0;
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
  const supportBottom = remainingPackingBoundsWithSlabCuts(packingLayout, sawmillCutPlan, currentStepIndex, planStep ? planStep.rotationValue : 0);
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

function renderCanvas(block, geom, v, sawList) {
  if (window.SawRenderCanvasLatestPlanAdapter && typeof window.SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans === "function") {
    window.SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans(block, geom, v, sawList);
    return;
  }

  renderTimberCanvas(block, geom, v, sawList);
}


function renderSawList(sawList) {
  const tbody = $("sawListTable").querySelector("tbody");
  tbody.innerHTML = "";
  for (const s of sawList) {
    const tr = document.createElement("tr");
    tr.className = (s.step - 1) === currentStepIndex ? "selected-step" : "";
    tr.innerHTML = `
      <td>${s.step}</td>
      <td>${s.rotation}</td>
      <td>${s.cut}</td>
      <td>${s.reference}</td>
      <td><strong>${s.rootSupportHeight.toFixed(0)} mm</strong></td>
      <td><strong>${s.topSupportHeight.toFixed(0)} mm</strong></td>
      <td><strong>${fmtIn(s.rootSupportHeight)} / ${fmtIn(s.topSupportHeight)}</strong></td>
      <td>${s.note}${Math.abs(s.supportHeightDiff) > 0.1 ? `<br><span class="hint">Skillnad rot–topp: ${s.supportHeightDiff.toFixed(0)} mm</span>` : ""}</td>
    `;
    tr.onclick = () => { currentStepIndex = s.step - 1; update(); };
    tbody.appendChild(tr);
  }
}


function renderSupportSideView(step, geom) {
  const s1 = $("support1Label");
  const s2 = $("support2Label");
  const view = $("supportSideView");
  if (!s1 || !s2 || !view || !step) return;

  const h1 = step.rootSupportHeight ?? step.bladeToBed ?? 0;
  const h2 = step.topSupportHeight ?? step.bladeToBed ?? 0;
  s1.textContent = `Stöd 1: ${h1.toFixed(0)} mm / ${fmtIn(h1)}`;
  s2.textContent = `Stöd 2: ${h2.toFixed(0)} mm / ${fmtIn(h2)}`;

  const log = view.querySelector(".logSide");
  if (log && geom) {
    const d1 = geom.support1Diameter || 0;
    const d2 = geom.support2Diameter || 0;
    log.style.setProperty("--d1", `${Math.max(18, Math.min(70, d1 / 5))}px`);
    log.style.setProperty("--d2", `${Math.max(18, Math.min(70, d2 / 5))}px`);
  }
}

function update() {
  $("manualRotationWrap").classList.toggle("hidden", $("rotationPreset").value !== "manual");
  renderDimensions();
  const v = values();
  const geom = computeGeometry(v);
  const block = findBestCenterBlock(geom, v);
  const sawList = buildSawList(block, geom, v);
  const sideYield = computeSideYield(block, geom, v);
  const packingLayout = $("optimizationMode") && $("optimizationMode").value === "sawmill" ? computeSawmillPacking(geom, v) : null;
  const sawmillCutPlan = packingLayout ? buildSawmillCutPlan(packingLayout, block, geom, v) : null;
  const activePlanLength = sawmillCutPlan ? sawmillCutPlan.length : sawList.length;
  if (currentStepIndex >= activePlanLength) currentStepIndex = 0;

  const sideArea = packingLayout ? packingLayout.reduce((sum, r) => sum + (r.w * r.h / 1e6), 0) : (sideYield ? sideYield.reduce((sum, s) => sum + (s.width * s.thickness / 1e6), 0) : 0);
  const sawnArea = block ? (block.width * block.height / 1e6 + sideArea) : 0;
  const logArea = Math.PI * Math.pow(geom.designDiameter/2, 2) / 1e6;
  const yieldPct = block && logArea ? (sawnArea / logArea) * 100 : 0;

  $("designDiameter").textContent = fmtMm(geom.designDiameter,0);
  $("usableDiameter").textContent = fmtMm(geom.usableDiameter,0);
  $("yieldPct").textContent = `${yieldPct.toFixed(1)} %`;
  $("sawnArea").textContent = `${sawnArea.toFixed(3)} m²`;
  $("logVolume").textContent = `${geom.logVolume.toFixed(3)} m³`;

  const order = $("sawOrder");
  if (!block) {
    order.innerHTML = `<div class="status-bad">Ingen aktiv dimension får plats med nuvarande designdiameter/användbar diameter.</div>`;
  } else {
    const step = sawmillCutPlan ? sawmillCutPlan[currentStepIndex] : sawList[currentStepIndex];
    order.innerHTML = `
      <div class="status-ok">
        Vald dimension: <strong>${block.resolvedLabel || (block.width + "×" + block.height)}</strong><br>
        Tillåten vankant: <strong>${block.allowedWane.toFixed(1)} mm</strong><br>
        Krav diagonal: <strong>${block.requiredDiagonal.toFixed(1)} mm</strong> istället för ${block.diagonal.toFixed(1)} mm<br>
        Aktuellt snitt: <strong>Steg ${step.step}, rotation ${step.rotation}</strong><br>
        Referens: <strong>${step.reference}</strong><br>
        ${sawmillCutPlan ? `Sågplan: <strong>${sawmillCutPlan.length} steg (sidobitar först)</strong><br>` : `Sidoutbyte: <strong>${sideYield.length} brädor/paneler</strong><br>`}
        Stöd 1: <strong>${step.rootSupportHeight.toFixed(0)} mm / ${fmtIn(step.rootSupportHeight)}</strong><br>
        Stöd 2: <strong>${step.topSupportHeight.toFixed(0)} mm / ${fmtIn(step.topSupportHeight)}</strong>
      </div>
      <div class="stepControls">
        <button id="prevStep">← Föregående snitt</button>
        <button id="nextStep">Nästa snitt →</button>
      </div>
    `;
    $("prevStep").onclick = () => { currentStepIndex = (currentStepIndex - 1 + activePlanLength) % activePlanLength; update(); };
    $("nextStep").onclick = () => { currentStepIndex = (currentStepIndex + 1) % activePlanLength; update(); };
  }

  const displayPlanForSupport = sawmillCutPlan || sawList;
  const displayStepForSupport = displayPlanForSupport[currentStepIndex] || displayPlanForSupport[0];
  renderSupportSideView(displayStepForSupport, geom);

  $("calcDetails").innerHTML = `
    <tr><td>Extrapolerad rotände</td><td>${fmtMm(geom.rootEnd,1)}</td></tr>
    <tr><td>Beräknad/angiven toppända</td><td>${fmtMm(geom.topEnd,1)}</td></tr>
    <tr><td>Minsta diameter i modell</td><td>${fmtMm(geom.minEnd,1)}</td></tr>
    <tr><td>Design-Ø efter krokighet</td><td>${fmtMm(geom.designDiameter,1)}</td></tr>
    <tr><td>Användbar Ø efter bark/marginal</td><td>${fmtMm(geom.usableDiameter,1)}</td></tr>
    <tr><td>Överhäng per ände</td><td>${fmtMm(geom.overhangEachEnd,0)}</td></tr>
    <tr><td>Tillåten vankant</td><td>${fmtMm(effectiveCornerWane(v),1)}</td></tr>
    <tr><td>Krav diagonal valt block</td><td>${block ? fmtMm(block.requiredDiagonal,1) : "–"}</td></tr>
  `;

  window.SawLatestPlans.setLatestPlans(packingLayout, sawmillCutPlan);
  if (packingLayout) renderPackingResult(packingLayout); else renderSideYield(sideYield);
  renderCanvas(block, geom, v, sawList);
  if (!renderSawmillCutPlan(sawmillCutPlan)) renderSawList(sawList);

  const displayPlan = sawmillCutPlan || sawList;
  if (displayPlan[currentStepIndex]) {
    const step = displayPlan[currentStepIndex];
    $("bigStep").textContent = `Steg ${step.step}`;
    $("bigHeight").textContent = `Stöd 1 ${step.rootSupportHeight.toFixed(0)} mm / ${fmtIn(step.rootSupportHeight)} · Stöd 2 ${step.topSupportHeight.toFixed(0)} mm / ${fmtIn(step.topSupportHeight)}`;
    $("bigRotation").textContent = `Rotation ${step.rotation} – ${step.cut}`;
    $("bigReference").textContent = step.reference;
  }
}

function sawListText() {
  const rows = [...$("sawListTable").querySelectorAll("tbody tr")].map(tr => [...tr.children].map(td => td.innerText.replace(/\n/g," ")).join("\t"));
  return ["Steg\tRotation\tSnitt\tReferens\tStöd 1\tStöd 2\tTum stöd 1/2\tKommentar", ...rows].join("\n");
}

for (const id of ["rootDiameter","topDiameter","rootEndDiameter","topEndDiameter","logLength","sweep","supportDistance","bark","kerf","margin","cornerWane","profileRadius","rotationPreset","manualRotation","optimizationMode"]) {
  $(id).addEventListener("input", () => { currentStepIndex = 0; update(); });
  $(id).addEventListener("change", () => { currentStepIndex = 0; update(); });
}

$("addDimension").onclick = () => { dimensions.push({active:false,type:"freeWidth",width:0,height:30,minWidth:0,wildEdge:false}); update(); };
$("presetTimber").onclick = () => {
  dimensions = [
    { active: true, type: "fixed", width: 190, height: 190, minWidth: 190, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: true, type: "fixed", width: 170, height: 170, minWidth: 170, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: false, type: "fixed", width: 150, height: 150, minWidth: 150, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: false, type: "freeWidth", width: 0, height: 50, minWidth: 0, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: false, type: "freeWidth", width: 0, height: 30, minWidth: 0, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: false, waneMm: false ? 20 : 0 },
    { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: true, waneMm: true ? 20 : 0 },
  ];
  currentStepIndex = 0;
  update();
};
$("printSawList").onclick = () => window.print();
$("copySawList").onclick = async () => {
  await navigator.clipboard.writeText(sawListText());
  alert("Såglistan kopierad.");
};
$("openBigScreen").onclick = () => $("bigScreen").classList.toggle("hidden");


const bigPrev = $("bigPrevStep");
if (bigPrev) bigPrev.onclick = () => {
  const v = values(), geom = computeGeometry(v), block = findBestCenterBlock(geom, v), sawList = buildSawList(block, geom, v);
  if (sawList.length) { currentStepIndex = (currentStepIndex - 1 + activePlanLength) % activePlanLength; update(); }
};
const bigNext = $("bigNextStep");
if (bigNext) bigNext.onclick = () => {
  const v = values(), geom = computeGeometry(v), block = findBestCenterBlock(geom, v), sawList = buildSawList(block, geom, v);
  if (sawList.length) { currentStepIndex = (currentStepIndex + 1) % activePlanLength; update(); }
};
setupTabs();


update();
