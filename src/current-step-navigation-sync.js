// src/current-step-navigation-sync.js
// Synkar navigering av aktuellt sågplanssteg till SawState.
//
// Legacy app.js äger fortfarande currentStepIndex och uppdaterar UI:t.
// Den här modulen lyssnar efter användarens navigeringsklick och speglar samma
// stegval till SawState. Den ändrar inte rendering, sågplan eller legacy-flöde.

(function installCurrentStepNavigationSync(global) {
  if (!global.SawState) {
    console.warn("SawState saknas. current-step-navigation-sync aktiveras inte.");
    return;
  }

  function activePlanLengthFromDom() {
    const rows = document.querySelectorAll("#sawListTable tbody tr");
    return Math.max(1, rows.length || 1);
  }

  function selectedIndexFromDom() {
    const rows = Array.from(document.querySelectorAll("#sawListTable tbody tr"));
    const selected = rows.findIndex(row => row.classList.contains("selected-step"));
    return selected >= 0 ? selected : global.SawState.getCurrentStepIndex();
  }

  function syncAfterLegacyClick() {
    // Vänta tills legacy onclick har hunnit köra update().
    setTimeout(() => {
      const selected = selectedIndexFromDom();
      global.SawState.setCurrentStepIndex(selected);
    }, 0);
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!target) return;

    if (target.id === "prevStep" || target.id === "bigPrevStep") {
      const len = activePlanLengthFromDom();
      global.SawState.moveCurrentStep(-1, len);
      syncAfterLegacyClick();
      return;
    }

    if (target.id === "nextStep" || target.id === "bigNextStep") {
      const len = activePlanLengthFromDom();
      global.SawState.moveCurrentStep(1, len);
      syncAfterLegacyClick();
      return;
    }

    const row = target.closest ? target.closest("#sawListTable tbody tr") : null;
    if (row) {
      const rows = Array.from(document.querySelectorAll("#sawListTable tbody tr"));
      const index = rows.indexOf(row);
      if (index >= 0) {
        global.SawState.setCurrentStepIndex(index);
        syncAfterLegacyClick();
      }
    }
  });
})(window);
