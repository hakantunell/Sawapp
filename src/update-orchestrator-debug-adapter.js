// src/update-orchestrator-debug-adapter.js
// Kontrollerad adapter/feature-flag för Sawapps update-läge.
//
// Standard: ViewModel-update är på.
//
// Det innebär att runtime normalt kör:
//
//   ViewModel -> renderers
//
// i stället för:
//
//   legacy update() -> adapter -> ViewModel -> renderers
//
// Tillfällig avaktivering via URL:
//
//   ?viewModelUpdate=0
//
// Tillfällig explicit aktivering via URL:
//
//   ?viewModelUpdate=1
//
// Avaktivera persistent i konsolen:
//
//   disableViewModelUpdateFeatureFlag()
//
// Aktivera persistent igen:
//
//   enableViewModelUpdateFeatureFlag()

(function installUpdateOrchestratorDebugAdapter(global) {
  if (global.__updateOrchestratorDebugAdapterInstalled) return;
  global.__updateOrchestratorDebugAdapterInstalled = true;

  const DISABLE_KEY = "sawapp.viewModelUpdate.disabled";
  const LEGACY_ENABLE_KEY = "sawapp.viewModelUpdate.enabled";
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

  function isPersistentlyDisabled() {
    try {
      return global.localStorage.getItem(DISABLE_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  function setPersistentlyDisabled(value) {
    try {
      if (value) global.localStorage.setItem(DISABLE_KEY, "true");
      else global.localStorage.removeItem(DISABLE_KEY);

      // Rensa gammal opt-in-flagga från tidigare migrationsläge.
      global.localStorage.removeItem(LEGACY_ENABLE_KEY);
    } catch (e) {
      // Ignorera om localStorage inte är tillgängligt.
    }
  }

  function shouldAutoEnable() {
    const urlFlag = readUrlFlag();
    if (urlFlag !== null) return urlFlag;
    return !isPersistentlyDisabled();
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
      setPersistentlyDisabled(false);
    }

    global.update();
    console.info("ViewModel-update aktiverad.");
    return true;
  }

  function disableViewModelUpdateDebug(options = {}) {
    if (options.persist === true) {
      setPersistentlyDisabled(true);
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
    return !isPersistentlyDisabled();
  }

  function isViewModelUpdatePersistentlyDisabled() {
    return isPersistentlyDisabled();
  }

  global.SawUpdateOrchestratorDebug = {
    enable: enableViewModelUpdateDebug,
    disable: disableViewModelUpdateDebug,
    enablePersistent: enableViewModelUpdateFeatureFlag,
    disablePersistent: disableViewModelUpdateFeatureFlag,
    isEnabled: isViewModelUpdateDebugEnabled,
    isPersistent: isViewModelUpdateFeatureFlagStored,
    isPersistentlyDisabled: isViewModelUpdatePersistentlyDisabled,
    disableKey: DISABLE_KEY,
  };

  global.enableViewModelUpdateDebug = enableViewModelUpdateDebug;
  global.disableViewModelUpdateDebug = disableViewModelUpdateDebug;
  global.enableViewModelUpdateFeatureFlag = enableViewModelUpdateFeatureFlag;
  global.disableViewModelUpdateFeatureFlag = disableViewModelUpdateFeatureFlag;
  global.isViewModelUpdateDebugEnabled = isViewModelUpdateDebugEnabled;
  global.isViewModelUpdateFeatureFlagStored = isViewModelUpdateFeatureFlagStored;
  global.isViewModelUpdatePersistentlyDisabled = isViewModelUpdatePersistentlyDisabled;

  if (shouldAutoEnable()) {
    global.setTimeout(() => enableViewModelUpdateDebug(), 0);
  }
})(window);
