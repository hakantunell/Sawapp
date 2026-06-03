// src/update-render-extract-adapter.js
// Adapter som kör legacy update() först och därefter den modulära
// ViewModel-baserade renderkedjan.
//
// Den här filen ska inte längre innehålla en egen kopia av rendersekvensen.
// All modulär rendering ska gå via SawUpdateOrchestrator så att legacy-fallback
// och ren ViewModel-update använder samma kodväg.

(function installUpdateRenderExtractAdapter(global) {
  if (global.__updateRenderExtractAdapterInstalled) return;
  if (typeof global.update !== "function") return;

  const canUseOrchestrator = !!(
    global.SawUpdateOrchestrator &&
    typeof global.SawUpdateOrchestrator.updateFromViewModel === "function"
  );

  if (!canUseOrchestrator) {
    console.warn("SawUpdateOrchestrator saknas. update-render-extract-adapter använder inte utbrutna renderers.");
    return;
  }

  global.__updateRenderExtractAdapterInstalled = true;
  const legacyUpdate = global.update;

  global.update = function updateWithExtractedRenderers() {
    legacyUpdate.apply(this, arguments);
    return global.SawUpdateOrchestrator.updateFromViewModel();
  };

  global.update();
})(window);
