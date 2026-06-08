function renderCanvas(block, geom, v, sawList) {
  if (window.SawRenderCanvasLatestPlanAdapter && typeof window.SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans === "function") {
    window.SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans(block, geom, v, sawList);
    return;
  }

  renderTimberCanvas(block, geom, v, sawList);
}


function renderSawList(sawList) {
  return window.SawRenderTimberSawList.renderTimberSawList(sawList);
}


function renderSupportSideView(step, geom) {
  return window.SawRenderSupportSideView.renderSupportSideView(step, geom);
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
  if (window.SawState.getCurrentStepIndex() >= activePlanLength) window.SawState.resetCurrentStepIndex();

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
    const currentStepIndex = window.SawState.getCurrentStepIndex();
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
    $("prevStep").onclick = () => { window.SawState.moveCurrentStep(-1, activePlanLength); update(); };
    $("nextStep").onclick = () => { window.SawState.moveCurrentStep(1, activePlanLength); update(); };
  }

  const displayPlanForSupport = sawmillCutPlan || sawList;
  const currentStepIndex = window.SawState.getCurrentStepIndex();
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
  const currentStepIndexForBigStep = window.SawState.getCurrentStepIndex();
  renderBigScreenStep(displayPlan[currentStepIndexForBigStep] || displayPlan[0]);
}

function sawListText() {
  const rows = [...$("sawListTable").querySelectorAll("tbody tr")].map(tr => [...tr.children].map(td => td.innerText.replace(/\n/g," ")).join("\t"));
  return ["Steg\tRotation\tSnitt\tReferens\tStöd 1\tStöd 2\tTum stöd 1/2\tKommentar", ...rows].join("\n");
}

for (const id of ["rootDiameter","topDiameter","rootEndDiameter","topEndDiameter","logLength","sweep","supportDistance","bark","kerf","margin","cornerWane","profileRadius","rotationPreset","manualRotation","optimizationMode"]) {
  $(id).addEventListener("input", () => { window.SawState.resetCurrentStepIndex(); update(); });
  $(id).addEventListener("change", () => { window.SawState.resetCurrentStepIndex(); update(); });
}

$("addDimension").onclick = () => { window.SawState.getDimensions().push({active:false,type:"freeWidth",width:0,height:30,minWidth:0,wildEdge:false}); update(); };
$("presetTimber").onclick = () => {
  window.SawState.resetDimensions();
  window.SawState.resetCurrentStepIndex();
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
  if (sawList.length) { window.SawState.moveCurrentStep(-1, sawList.length); update(); }
};
const bigNext = $("bigNextStep");
if (bigNext) bigNext.onclick = () => {
  const v = values(), geom = computeGeometry(v), block = findBestCenterBlock(geom, v), sawList = buildSawList(block, geom, v);
  if (sawList.length) { window.SawState.moveCurrentStep(1, sawList.length); update(); }
};
setupTabs();


update();
