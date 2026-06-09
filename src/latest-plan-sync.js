// src/latest-plan-sync.js
// Migreringsbrygga för packningslayout och sågverksplan.
//
// Tidigare wrappade den här modulen update() direkt. Under den nya laddordningen
// kan update() laddas senare, och ViewModel/UpdateContext skriver redan latest
// plans via SawLatestPlans. Därför är modulen nu passiv: den exponerar sync- och
// diagnostikfunktioner utan att kräva att update() finns vid laddning.

(function installLatestPlanSync(global) {
  function hasState() {
    return !!global.SawState;
  }

  function isViewModelModeEnabled() {
    return global.__viewModelUpdateDebugEnabled === true;
  }

  function stateHasLatestPlans() {
    if (!hasState()) return false;

    const statePlans = typeof global.SawState.getLatestPlans === "function"
      ? global.SawState.getLatestPlans()
      : null;

    if (statePlans) {
      return !!(
        (Array.isArray(statePlans.packingLayout) && statePlans.packingLayout.length) ||
        (Array.isArray(statePlans.sawmillCutPlan) && statePlans.sawmillCutPlan.length) ||
        (Array.isArray(statePlans.latestPackingLayout) && statePlans.latestPackingLayout.length) ||
        (Array.isArray(statePlans.latestSawmillCutPlan) && statePlans.latestSawmillCutPlan.length)
      );
    }

    const packing = typeof global.SawState.getLatestPackingLayout === "function"
      ? global.SawState.getLatestPackingLayout()
      : null;
    const plan = typeof global.SawState.getLatestSawmillCutPlan === "function"
      ? global.SawState.getLatestSawmillCutPlan()
      : null;

    return !!(
      (Array.isArray(packing) && packing.length) ||
      (Array.isArray(plan) && plan.length)
    );
  }

  function readLegacyPlans() {
    if (global.SawLatestPlans && typeof global.SawLatestPlans.fromLegacyGlobals === "function") {
      return global.SawLatestPlans.fromLegacyGlobals();
    }

    return { packingLayout: null, sawmillCutPlan: null };
  }

  function legacyPlansHaveContent(plans) {
    return !!(
      plans &&
      ((Array.isArray(plans.packingLayout) && plans.packingLayout.length) ||
       (Array.isArray(plans.sawmillCutPlan) && plans.sawmillCutPlan.length))
    );
  }

  function plansHaveSamePresence(left, right) {
    return legacyPlansHaveContent(left) === legacyPlansHaveContent(right);
  }

  function syncLatestPlansToState(force) {
    if (!hasState()) return false;

    if (!force && isViewModelModeEnabled() && stateHasLatestPlans()) {
      return false;
    }

    try {
      const legacyPlans = readLegacyPlans();
      if (global.SawLatestPlans && typeof global.SawLatestPlans.setLatestPlans === "function") {
        if (legacyPlansHaveContent(legacyPlans)) {
          global.SawLatestPlans.setLatestPlans(legacyPlans.packingLayout, legacyPlans.sawmillCutPlan);
        } else if (typeof global.SawLatestPlans.resetLatestPlans === "function") {
          global.SawLatestPlans.resetLatestPlans();
        } else {
          global.SawLatestPlans.setLatestPlans(null, null);
        }
      } else if (typeof global.SawState.setLatestPlans === "function") {
        global.SawState.setLatestPlans(legacyPlans.packingLayout, legacyPlans.sawmillCutPlan);
      }
      return true;
    } catch (error) {
      console.warn("Kunde inte synka latest plan-state till SawState.", error);
      return false;
    }
  }

  function latestPlanSyncDiagnostics() {
    const legacyPlans = readLegacyPlans();
    const statePlans = hasState() && typeof global.SawState.getLatestPlans === "function"
      ? global.SawState.getLatestPlans()
      : null;
    const accessorPlans = global.SawLatestPlans && typeof global.SawLatestPlans.getLatestPlans === "function"
      ? global.SawLatestPlans.getLatestPlans()
      : null;

    const diagnostics = {
      viewModelModeEnabled: isViewModelModeEnabled(),
      legacyHasPlans: legacyPlansHaveContent(legacyPlans),
      stateHasPlans: stateHasLatestPlans(),
      accessorHasPlans: global.SawLatestPlans && typeof global.SawLatestPlans.hasLatestPlans === "function"
        ? global.SawLatestPlans.hasLatestPlans()
        : false,
      legacyPlans,
      statePlans,
      accessorPlans,
    };

    diagnostics.legacyAndStatePresenceMatch = plansHaveSamePresence(legacyPlans, statePlans);
    diagnostics.legacyAndAccessorPresenceMatch = plansHaveSamePresence(legacyPlans, accessorPlans);
    diagnostics.stateAndAccessorPresenceMatch = plansHaveSamePresence(statePlans, accessorPlans);

    return diagnostics;
  }

  global.syncLatestPlansToState = syncLatestPlansToState;
  global.latestPlanSyncDiagnostics = latestPlanSyncDiagnostics;

  if (hasState()) {
    syncLatestPlansToState(false);
  }
})(window);
