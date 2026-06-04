// src/latest-plan-sync.js
// Migreringsbrygga för packningslayout och sågverksplan.
//
// app.js skriver fortfarande latestPackingLayout/latestSawmillCutPlan direkt.
// Den här modulen läser dessa legacy-värden efter update() och för över dem till
// SawLatestPlans/SawState så att övriga moduler kan använda accessorlagret.
// När app.js skriver direkt till SawLatestPlans kan den här modulen tas bort.

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
    const statePlans = global.SawState && typeof global.SawState.getLatestPlans === "function"
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
      } else {
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
    const statePlans = global.SawState && typeof global.SawState.getLatestPlans === "function"
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

  global.update = function updateWithLatestPlanSync() {
    const result = legacyUpdate.apply(this, arguments);
    syncLatestPlansToState(false);
    return result;
  };

  global.syncLatestPlansToState = syncLatestPlansToState;
  global.latestPlanSyncDiagnostics = latestPlanSyncDiagnostics;

  syncLatestPlansToState(false);
})(window);
