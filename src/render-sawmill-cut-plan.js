// src/render-sawmill-cut-plan.js
// Renderer för sågverksplanens tabell.

(function initSawRenderSawmillCutPlan(global) {
  function getCurrentStepIndex() {
    if (global.SawState && typeof global.SawState.getCurrentStepIndex === "function") {
      return global.SawState.getCurrentStepIndex();
    }
    return typeof currentStepIndex !== "undefined" ? currentStepIndex : 0;
  }

  function setCurrentStepIndex(index) {
    if (global.SawState && typeof global.SawState.setCurrentStepIndex === "function") {
      global.SawState.setCurrentStepIndex(index);
    }
    if (typeof currentStepIndex !== "undefined") {
      currentStepIndex = index;
    }
  }

  function formatInches(mm) {
    if (typeof global.fmtIn === "function") return global.fmtIn(mm);
    return `${(mm / 25.4).toFixed(2)}"`;
  }

  function renderSawmillCutPlan(plan) {
    const table = global.$ ? global.$("sawListTable") : document.getElementById("sawListTable");
    if (!table) return false;
    const tbody = table.querySelector("tbody");
    if (!tbody) return false;

    if (!plan || !plan.length) return false;

    const selectedIndex = getCurrentStepIndex();
    tbody.innerHTML = "";

    for (const s of plan) {
      const tr = document.createElement("tr");
      tr.className = (s.step - 1) === selectedIndex ? "selected-step" : "";

      const action = s.cut || (
        s.kind === "slab" ? "Ta bort ytterdel" :
        s.kind === "side" ? "Frigör " + s.label :
        "Blocka " + s.label
      );

      const ref = s.reference || (
        s.kind === "slab" ? "Yttersnitt" :
        s.kind === "side" ? "Planksnitt utan rotation" :
        "Kärna sist"
      );

      tr.innerHTML = `
        <td>${s.step}</td>
        <td>${s.rotation}</td>
        <td>${action}</td>
        <td>${ref}</td>
        <td><strong>${s.rootSupportHeight.toFixed(0)} mm</strong></td>
        <td><strong>${s.topSupportHeight.toFixed(0)} mm</strong></td>
        <td><strong>${formatInches(s.rootSupportHeight)} / ${formatInches(s.topSupportHeight)}</strong></td>
        <td>${s.note}</td>
      `;

      tr.onclick = () => {
        setCurrentStepIndex(s.step - 1);
        if (typeof global.update === "function") global.update();
      };
      tbody.appendChild(tr);
    }

    return true;
  }

  global.SawRenderSawmillCutPlan = {
    renderSawmillCutPlan,
  };

  if (typeof global.renderSawmillCutPlan === "function") {
    global.renderSawmillCutPlanLegacy = global.renderSawmillCutPlan;
    global.renderSawmillCutPlan = renderSawmillCutPlan;
  }

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
