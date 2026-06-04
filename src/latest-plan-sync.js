// src/latest-plan-sync.js
// Legacy-fallback för packningslayout och sågverksplan.
//
// SawState är primär ägare i ViewModel-läge. Den här modulen får därför inte
// skriva över planer som redan har skapats av ViewModel-kedjan.

(function installLatestPlanSync(global) {
  if (!global.SawState || typeof global.update !== "function") {
    console.warn("SawState eller update() saknas. latest-plan-sync aktiveras inte.");
    return;
  }

  const legacyUpdate = global.update;

  function isViewModelModeEnabled() {
    return global.__viewModelUpdateDebugEnabled === true;
  }

  function stateHasLatestPlans() {
    if (typeof global.SawState.hasLatestPlans === "function") {
      return global.SawState.hasLatestPlans();
    }
    const packing = typeof global.SawState.getLatestPackingLayout === "function"
      ? global.SawState.getLatestPackingLayout()
      : null;
    const plan = typeof global.SawState.getLatestSawmillCutPlan === "function"
      ? global.SawState.getLatestSawmillCutPlan()
      : null;
    return !!(packing || plan);
  }

  function readLegacyPlans() {
    if (global.SawLatestPlans && typeof global.SawLatestPlans.fromLegacyGlobals === "function") {
      return global.SawLatestPlans.fromLegacyGlobals();
    }

    return { packingLayout: null, sawmillCutPlan: null };
  }

  function syncLatestPlansToState(force) {
    if (!force && isViewModelModeEnabled() && stateHasLatestPlans()) {
      return false;
    }

    try {
      const legacyPlans = readLegacyPlans();
      if (global.SawLatestPlans && typeof global.SawLatestPlans.setLatestPlans === "function") {
        global.SawLatestPlans.setLatestPlans(legacyPlans.packingLayout, legacyPlans.sawmillCutPlan);
      } else {
        global.SawState.setLatestPlans(legacyPlans.packingLayout, legacyPlans.sawmillCutPlan);
      }
      return true;
    } catch (error) {
      console.warn("Kunde inte synka latest plan-state till SawState.", error);
      return false;
    }
  }

  global.update = function updateWithLatestPlanSync() {
    const result = legacyUpdate.apply(this, arguments);
    syncLatestPlansToState(false);
    return result;
  };

  global.syncLatestPlansToState = syncLatestPlansToState;

  syncLatestPlansToState(false);
})(window);
