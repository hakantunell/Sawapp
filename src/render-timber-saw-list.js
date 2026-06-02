// src/render-timber-saw-list.js
// Renderer för den vanliga timmer-/blockningssåglistan.
//
// Passiv modul. Den påverkar inte sågverkslägets tabell och ändrar inga
// beräkningar. Den är avsedd att aktiveras senare när timmerläget bryts ut.

(function initSawRenderTimberSawList(global) {
  function formatInches(mm) {
    if (typeof global.fmtIn === "function") return global.fmtIn(mm);
    return `${(Number(mm) / 25.4).toFixed(2)}\"`;
  }

  function setCurrentStepIndex(index) {
    if (global.SawState && typeof global.SawState.setCurrentStepIndex === "function") {
      global.SawState.setCurrentStepIndex(index);
    }
    if (typeof global.currentStepIndex === "number") {
      global.currentStepIndex = index;
    }
  }

  function currentStepIndex() {
    if (global.SawState && typeof global.SawState.getCurrentStepIndex === "function") {
      return global.SawState.getCurrentStepIndex();
    }
    return typeof global.currentStepIndex === "number" ? global.currentStepIndex : 0;
  }

  function renderTimberSawList(sawList) {
    const table = global.$ ? global.$("sawListTable") : document.getElementById("sawListTable");
    if (!table) return false;
    const tbody = table.querySelector("tbody");
    if (!tbody) return false;
    if (!Array.isArray(sawList) || !sawList.length) return false;

    const selected = currentStepIndex();
    tbody.innerHTML = "";

    for (const s of sawList) {
      const rootSupportHeight = Number.isFinite(s.rootSupportHeight) ? s.rootSupportHeight : s.bladeToBed;
      const topSupportHeight = Number.isFinite(s.topSupportHeight) ? s.topSupportHeight : s.bladeToBed;
      const tr = document.createElement("tr");
      tr.className = (s.step - 1) === selected ? "selected-step" : "";
      tr.innerHTML = `
        <td>${s.step}</td>
        <td>${s.rotation}</td>
        <td>${s.cut || ""}</td>
        <td>${s.reference || ""}</td>
        <td><strong>${Number(rootSupportHeight || 0).toFixed(0)} mm</strong></td>
        <td><strong>${Number(topSupportHeight || 0).toFixed(0)} mm</strong></td>
        <td><strong>${formatInches(rootSupportHeight || 0)} / ${formatInches(topSupportHeight || 0)}</strong></td>
        <td>${s.note || ""}</td>
      `;
      tr.onclick = () => {
        setCurrentStepIndex(s.step - 1);
        if (typeof global.update === "function") global.update();
      };
      tbody.appendChild(tr);
    }

    return true;
  }

  global.SawRenderTimberSawList = {
    renderTimberSawList,
  };

  global.renderTimberSawList = renderTimberSawList;
})(window);
