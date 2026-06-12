function update() {
  if (typeof renderDimensions === "function") {
    renderDimensions();
  }

  if (typeof renderInputVisibility === "function") {
    renderInputVisibility();
  } else {
    $("manualRotationWrap").classList.toggle("hidden", $("rotationPreset").value !== "manual");
  }

  if (window.SawUpdateOrchestrator && typeof window.SawUpdateOrchestrator.updateFromViewModel === "function") {
    return window.SawUpdateOrchestrator.updateFromViewModel();
  }

  if (!window.SawUpdatePipeline || !window.SawUpdateRendering) {
    throw new Error("SawUpdatePipeline eller SawUpdateRendering saknas. Kontrollera laddordningen i src/app.js.");
  }

  const context = window.SawUpdatePipeline.buildPlanContext();
  window.SawUpdateRendering.renderSummary(context);
  window.SawUpdateRendering.renderOrderStatus(context);
  window.SawUpdateRendering.renderAll(context);
  return context;
}

function sawListText() {
  const rows = [...$("sawListTable").querySelectorAll("tbody tr")].map(tr => [...tr.children].map(td => td.innerText.replace(/\n/g," ")).join("\t"));
  return ["Steg\tRotation\tSnitt\tReferens\tStöd 1\tStöd 2\tTum stöd 1/2\tKommentar", ...rows].join("\n");
}

function currentPlanContext() {
  if (window.SawUpdatePipeline && typeof window.SawUpdatePipeline.buildPlanContext === "function") {
    return window.SawUpdatePipeline.buildPlanContext();
  }
  return null;
}

function resetStepAndUpdate() {
  if (window.SawUpdatePipeline && typeof window.SawUpdatePipeline.resetCurrentStepIndex === "function") {
    window.SawUpdatePipeline.resetCurrentStepIndex();
  } else if (window.SawState && typeof window.SawState.resetCurrentStepIndex === "function") {
    window.SawState.resetCurrentStepIndex();
  }

  update();
}

for (const id of ["rootDiameter","topDiameter","rootEndDiameter","topEndDiameter","logLength","sweep","supportDistance","bladeHeightDisplay","bark","kerf","margin","cornerWane","profileRadius","rotationPreset","manualRotation","optimizationMode"]) {
  const el = $(id);
  if (!el) continue;
  el.addEventListener("input", resetStepAndUpdate);
  el.addEventListener("change", resetStepAndUpdate);
}

$("addDimension").onclick = () => {
  window.SawState.getDimensions().push({active:false,type:"freeWidth",width:0,height:30,minWidth:0,wildEdge:false});
  update();
};

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
  const context = currentPlanContext();
  if (!context || !context.activePlanLength) return;
  window.SawState.moveCurrentStep(delta, context.activePlanLength);
  update();
}

const bigPrev = $("bigPrevStep");
if (bigPrev) bigPrev.onclick = () => moveBigStep(-1);

const bigNext = $("bigNextStep");
if (bigNext) bigNext.onclick = () => moveBigStep(1);

setupTabs();
update();