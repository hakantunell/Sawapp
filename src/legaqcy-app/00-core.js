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
  let active = window.SawState.getDimensions().filter(d => d.active);

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
