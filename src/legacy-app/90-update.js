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

function renderInputState() {
  if (typeof window.renderInputVisibility === "function") {
    window.renderInputVisibility();
    return;
  }

  $("manualRotationWrap").classList.toggle("hidden", $("rotationPreset").value !== "manual");
}

function buildLegacyPlanContext() {
  if (window.SawUpdatePipeline && typeof window.SawUpdatePipeline.buildPlanContext === "function") {
    return window.SawUpdatePipeline.buildPlanContext();
  }

  const v = values();
  const geom = computeGeometry(v);
  const block = findBestCenterBlock(geom, v);
  const sawList = buildSawList(block, geom, v);
  const sideYield = computeSideYield(block, geom, v);
  const packingLayout = $("optimizationMode") && $("optimizationMode").value === "sawmill" ? computeSawmillPacking(geom, v) : null;
  const sawmillCutPlan = packingLayout ? buildSawmillCutPlan(packingLayout, block, geom, v) : null;
  const activePlan = sawmillCutPlan || sawList;
  const activePlanLength = activePlan.length;

  if (window.SawState.getCurrentStepIndex() >= activePlanLength) {
    window.SawState.resetCurrentStepIndex();
  }

  const sideArea = packingLayout
    ? packingLayout.reduce((sum, r) => sum + (r.w * r.h / 1e6), 0)
    : (sideYield ? sideYield.reduce((sum, s) => sum + (s.width * s.thickness / 1e6), 0) : 0);
  const sawnArea = block ? (block.width * block.height / 1e6 + sideArea) : 0;
  const logArea = Math.PI * Math.pow(geom.designDiameter / 2, 2) / 1e6;
  const yieldPct = block && logArea ? (sawnArea / logArea) * 100 : 0;
  const stepIndex = window.SawState.getCurrentStepIndex();

  return {
    v,
    geom,
    block,
    sawList,
    sideYield,
    packingLayout,
    sawmillCutPlan,
    activePlan,
    activePlanLength,
    stepIndex,
    step: activePlan[stepIndex] || activePlan[0],
    metrics: { sideArea, sawnArea, logArea, yieldPct },
  };
}

function renderLegacySummary(context) {
  if (window.SawUpdateRendering && typeof window.SawUpdateRendering.renderSummary === "function") {
    window.SawUpdateRendering.renderSummary(context);
    return;
  }

  $("designDiameter").textContent = fmtMm(context.geom.designDiameter, 0);
  $("usableDiameter").textContent = fmtMm(context.geom.usableDiameter, 0);
  $("yieldPct").textContent = `${context.metrics.yieldPct.toFixed(1)} %`;
  $("sawnArea").textContent = `${context.metrics.sawnArea.toFixed(3)} m²`;
  $("logVolume").textContent = `${context.geom.logVolume.toFixed(3)} m³`;
}

function renderLegacyOrderStatus(context) {
  if (window.SawUpdateRendering && typeof window.SawUpdateRendering.renderOrderStatus === "function") {
    if (window.SawUpdateRendering.renderOrderStatus(context)) return;
  }

  const order = $("sawOrder");
  if (!context.block || !context.step) {
    order.innerHTML = `<div class="status-bad">Ingen aktiv dimension får plats med nuvarande designdiameter/användbar diameter.</div>`;
    return;
  }

  const block = context.block;
  const step = context.step;
  order.innerHTML = `
    <div class="status-ok">
      Vald dimension: <strong>${block.resolvedLabel || (block.width + "×" + block.height)}</strong><br>
      Tillåten vankant: <strong>${block.allowedWane.toFixed(1)} mm</strong><br>
      Krav diagonal: <strong>${block.requiredDiagonal.toFixed(1)} mm</strong> istället för ${block.diagonal.toFixed(1)} mm<br>
      Aktuellt snitt: <strong>Steg ${step.step}, rotation ${step.rotation}</strong><br>
      Referens: <strong>${step.reference}</strong><br>
      ${context.sawmillCutPlan ? `Sågplan: <strong>${context.sawmillCutPlan.length} steg (sidobitar först)</strong><br>` : `Sidoutbyte: <strong>${context.sideYield.length} brädor/paneler</strong><br>`}
      Stöd 1: <strong>${step.rootSupportHeight.toFixed(0)} mm / ${fmtIn(step.rootSupportHeight)}</strong><br>
      Stöd 2: <strong>${step.topSupportHeight.toFixed(0)} mm / ${fmtIn(step.topSupportHeight)}</strong>
    </div>
    <div class="stepControls">
      <button id="prevStep">← Föregående snitt</button>
      <button id="nextStep">Nästa snitt →</button>
    </div>
  `;
  $("prevStep").onclick = () => { window.SawState.moveCurrentStep(-1, context.activePlanLength); update(); };
  $("nextStep").onclick = () => { window.SawState.moveCurrentStep(1, context.activePlanLength); update(); };
}

function renderLegacyDetails(context) {
  if (window.SawUpdateRendering && typeof window.SawUpdateRendering.renderAll === "function") {
    window.SawUpdateRendering.renderAll(context);
    return;
  }

  const displayStepForSupport = context.step || context.activePlan[0];
  renderSupportSideView(displayStepForSupport, context.geom);

  $("calcDetails").innerHTML = `
    <tr><td>Extrapolerad rotände</td><td>${fmtMm(context.geom.rootEnd, 1)}</td></tr>
    <tr><td>Beräknad/angiven toppända</td><td>${fmtMm(context.geom.topEnd, 1)}</td></tr>
    <tr><td>Minsta diameter i modell</td><td>${fmtMm(context.geom.minEnd, 1)}</td></tr>
    <tr><td>Design-Ø efter krokighet</td><td>${fmtMm(context.geom.designDiameter, 1)}</td></tr>
    <tr><td>Användbar Ø efter bark/marginal</td><td>${fmtMm(context.geom.usableDiameter, 1)}</td></tr>
    <tr><td>Överhäng per ände</td><td>${fmtMm(context.geom.overhangEachEnd, 0)}</td></tr>
    <tr><td>Tillåten vankant</td><td>${fmtMm(effectiveCornerWane(context.v), 1)}</td></tr>
    <tr><td>Krav diagonal valt block</td><td>${context.block ? fmtMm(context.block.requiredDiagonal, 1) : "–"}</td></tr>
  `;

  window.SawLatestPlans.setLatestPlans(context.packingLayout, context.sawmillCutPlan);
  if (context.packingLayout) renderPackingResult(context.packingLayout); else renderSideYield(context.sideYield);
  renderCanvas(context.block, context.geom, context.v, context.sawList);
  if (!renderSawmillCutPlan(context.sawmillCutPlan)) renderSawList(context.sawList);
  renderBigScreenStep(context.step || context.activePlan[0]);
}

function update() {
  renderInputState();
  renderDimensions();

  const context = buildLegacyPlanContext();

  renderLegacySummary(context);
  renderLegacyOrderStatus(context);
  renderLegacyDetails(context);
}

function sawListText() {
  const rows = [...$("sawListTable").querySelectorAll("tbody tr")].map(tr => [...tr.children].map(td => td.innerText.replace(/\n/g," ")).join("\t"));
  return ["Steg\tRotation\tSnitt\tReferens\tStöd 1\tStöd 2\tTum stöd 1/2\tKommentar", ...rows].join("\n");
}

function resetStepAndUpdate() {
  if (window.SawUpdatePipeline && typeof window.SawUpdatePipeline.resetCurrentStepIndex === "function") {
    window.SawUpdatePipeline.resetCurrentStepIndex();
  } else {
    window.SawState.resetCurrentStepIndex();
  }

  update();
}

for (const id of ["rootDiameter","topDiameter","rootEndDiameter","topEndDiameter","logLength","sweep","supportDistance","bark","kerf","margin","cornerWane","profileRadius","rotationPreset","manualRotation","optimizationMode"]) {
  $(id).addEventListener("input", resetStepAndUpdate);
  $(id).addEventListener("change", resetStepAndUpdate);
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

function moveBigStep(delta) {
  const context = buildLegacyPlanContext();
  if (!context.activePlanLength) return;
  window.SawState.moveCurrentStep(delta, context.activePlanLength);
  update();
}

const bigPrev = $("bigPrevStep");
if (bigPrev) bigPrev.onclick = () => moveBigStep(-1);
const bigNext = $("bigNextStep");
if (bigNext) bigNext.onclick = () => moveBigStep(1);
setupTabs();

update();
