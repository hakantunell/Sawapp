// src/update-orchestrator-debug-adapter.js
// Kontrollerad adapter/feature-flag för att testa den rena ViewModel-baserade
// update-vägen.
//
// Standard: av.
//
// Aktivera tillfälligt i webbläsarkonsolen:
//
//   enableViewModelUpdateDebug()
//
// Avaktivera:
//
//   disableViewModelUpdateDebug()
//
// Aktivera persistent via localStorage:
//
//   enableViewModelUpdateFeatureFlag()
//
// Avaktivera persistent:
//
//   disableViewModelUpdateFeatureFlag()
//
// Aktivera via URL utan localStorage:
//
//   ?viewModelUpdate=1
//
// Avaktivera via URL:
//
//   ?viewModelUpdate=0

(function installUpdateOrchestratorDebugAdapter(global) {
  if (global.__updateOrchestratorDebugAdapterInstalled) return;
  global.__updateOrchestratorDebugAdapterInstalled = true;

  const FLAG_KEY = "sawapp.viewModelUpdate.enabled";
  let legacyUpdate = null;
  let enabled = false;

  function readUrlFlag() {
    try {
      const params = new URLSearchParams(global.location.search || "");
      if (params.get("viewModelUpdate") === "1") return true;
      if (params.get("viewModelUpdate") === "0") return false;
    } catch (e) {
      // Ignorera miljöer utan URLSearchParams/location.
    }
    return null;
  }

  function readStoredFlag() {
    try {
      return global.localStorage.getItem(FLAG_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  function writeStoredFlag(value) {
    try {
      if (value) global.localStorage.setItem(FLAG_KEY, "true");
      else global.localStorage.removeItem(FLAG_KEY);
    } catch (e) {
      // Ignorera om localStorage inte är tillgängligt.
    }
  }

  function shouldAutoEnable() {
    const urlFlag = readUrlFlag();
    if (urlFlag !== null) return urlFlag;
    return readStoredFlag();
  }

  function canEnable() {
    if (typeof global.update !== "function") {
      console.warn("Kan inte aktivera ViewModel-update: update saknas.");
      return false;
    }

    if (!global.SawUpdateOrchestrator || typeof global.SawUpdateOrchestrator.updateFromViewModel !== "function") {
      console.warn("Kan inte aktivera ViewModel-update: SawUpdateOrchestrator saknas.");
      return false;
    }

    return true;
  }

  function enableViewModelUpdateDebug(options = {}) {
    if (enabled) return true;
    if (!canEnable()) return false;

    legacyUpdate = global.update;
    global.updateLegacyBeforeViewModelDebug = legacyUpdate;

    global.update = function updateUsingViewModelOnly() {
      return global.SawUpdateOrchestrator.updateFromViewModel();
    };

    enabled = true;
    global.__viewModelUpdateDebugEnabled = true;

    if (options.persist === true) {
      writeStoredFlag(true);
    }

    global.update();
    console.info("ViewModel-update aktiverad. Kör disableViewModelUpdateDebug() för att återställa.");
    return true;
  }

  function disableViewModelUpdateDebug(options = {}) {
    if (options.persist === true) {
      writeStoredFlag(false);
    }

    if (!enabled) return true;

    if (typeof legacyUpdate === "function") {
      global.update = legacyUpdate;
    }

    enabled = false;
    global.__viewModelUpdateDebugEnabled = false;
    global.update();
    console.info("ViewModel-update avaktiverad. Legacy update återställd.");
    return true;
  }

  function enableViewModelUpdateFeatureFlag() {
    return enableViewModelUpdateDebug({ persist: true });
  }

  function disableViewModelUpdateFeatureFlag() {
    return disableViewModelUpdateDebug({ persist: true });
  }

  function isViewModelUpdateDebugEnabled() {
    return enabled;
  }

  function isViewModelUpdateFeatureFlagStored() {
    return readStoredFlag();
  }

  global.SawUpdateOrchestratorDebug = {
    enable: enableViewModelUpdateDebug,
    disable: disableViewModelUpdateDebug,
    enablePersistent: enableViewModelUpdateFeatureFlag,
    disablePersistent: disableViewModelUpdateFeatureFlag,
    isEnabled: isViewModelUpdateDebugEnabled,
    isPersistent: isViewModelUpdateFeatureFlagStored,
    flagKey: FLAG_KEY,
  };

  global.enableViewModelUpdateDebug = enableViewModelUpdateDebug;
  global.disableViewModelUpdateDebug = disableViewModelUpdateDebug;
  global.enableViewModelUpdateFeatureFlag = enableViewModelUpdateFeatureFlag;
  global.disableViewModelUpdateFeatureFlag = disableViewModelUpdateFeatureFlag;
  global.isViewModelUpdateDebugEnabled = isViewModelUpdateDebugEnabled;
  global.isViewModelUpdateFeatureFlagStored = isViewModelUpdateFeatureFlagStored;

  if (shouldAutoEnable()) {
    global.setTimeout(() => enableViewModelUpdateDebug(), 0);
  }
})(window);
