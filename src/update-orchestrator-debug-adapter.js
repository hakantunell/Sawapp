// src/update-orchestrator-debug-adapter.js
// Debug-adapter för att kunna testa den rena ViewModel-baserade update-vägen.
//
// Den aktiveras inte automatiskt. Använd i webbläsarkonsolen:
//
//   enableViewModelUpdateDebug()
//
// Då ersätts window.update med updateFromViewModel().
//
// Återställ med:
//
//   disableViewModelUpdateDebug()

(function installUpdateOrchestratorDebugAdapter(global) {
  if (global.__updateOrchestratorDebugAdapterInstalled) return;
  global.__updateOrchestratorDebugAdapterInstalled = true;

  let legacyUpdate = null;
  let enabled = false;

  function enableViewModelUpdateDebug() {
    if (enabled) return true;

    if (typeof global.update !== "function") {
      console.warn("Kan inte aktivera ViewModel-update: update saknas.");
      return false;
    }

    if (!global.SawUpdateOrchestrator || typeof global.SawUpdateOrchestrator.updateFromViewModel !== "function") {
      console.warn("Kan inte aktivera ViewModel-update: SawUpdateOrchestrator saknas.");
      return false;
    }

    legacyUpdate = global.update;
    global.updateLegacyBeforeViewModelDebug = legacyUpdate;

    global.update = function updateUsingViewModelOnly() {
      return global.SawUpdateOrchestrator.updateFromViewModel();
    };

    enabled = true;
    global.__viewModelUpdateDebugEnabled = true;
    global.update();
    console.info("ViewModel-update debug aktiverad. Kör disableViewModelUpdateDebug() för att återställa.");
    return true;
  }

  function disableViewModelUpdateDebug() {
    if (!enabled) return true;

    if (typeof legacyUpdate === "function") {
      global.update = legacyUpdate;
    }

    enabled = false;
    global.__viewModelUpdateDebugEnabled = false;
    global.update();
    console.info("ViewModel-update debug avaktiverad. Legacy update återställd.");
    return true;
  }

  function isViewModelUpdateDebugEnabled() {
    return enabled;
  }

  global.SawUpdateOrchestratorDebug = {
    enable: enableViewModelUpdateDebug,
    disable: disableViewModelUpdateDebug,
    isEnabled: isViewModelUpdateDebugEnabled,
  };

  global.enableViewModelUpdateDebug = enableViewModelUpdateDebug;
  global.disableViewModelUpdateDebug = disableViewModelUpdateDebug;
  global.isViewModelUpdateDebugEnabled = isViewModelUpdateDebugEnabled;
})(window);
