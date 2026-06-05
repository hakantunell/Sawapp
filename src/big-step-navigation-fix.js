// src/big-step-navigation-fix.js
// Säker fix för storskärmens Föregående/Nästa-knappar.
//
// I legacy app.js använder bigPrevStep/bigNextStep variabeln `activePlanLength`,
// men den variabeln är lokal inne i update() och finns inte i knapparnas scope.
// Den här modulen ersätter bara storskärmsknapparnas handlers efter att legacy app.js
// och fix-filerna har laddats. Vanliga såglistan och canvas-renderingen påverkas inte.

(function installBigStepNavigationFix(global) {
  function byId(id) {
    return document.getElementById(id);
  }

  function activePlanLengthFromDom() {
    const rows = document.querySelectorAll("#sawListTable tbody tr");
    return Math.max(1, rows.length || 1);
  }

  function moveBigStep(delta) {
    const len = activePlanLengthFromDom();

    if (global.SawState && typeof global.SawState.moveCurrentStep === "function") {
      global.SawState.moveCurrentStep(Number(delta || 0), len);
    }

    if (typeof global.update === "function") {
      global.update();
    }
  }

 
  const prev = byId("bigPrevStep");
  if (prev) {
    prev.onclick = () => moveBigStep(-1);
  }

  const next = byId("bigNextStep");
  if (next) {
    next.onclick = () => moveBigStep(1);
  }
})(window);
