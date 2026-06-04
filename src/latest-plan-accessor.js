// src/latest-plan-accessor.js
// Gemensam åtkomstpunkt för senaste sågverks-/packningsplan.
//
// Primär källa är SawState i ViewModel-läge. Legacy-globals används som fallback
// under migrationen och som primär källa när ViewModel-update har stängts av för
// felsökning.

(function initSawLatestPlanAccessor(global) {
  function isViewModelModeEnabled() {
    return global.__viewModelUpdateDebugEnabled === true;
  }

  function fromState() {
    if (global.SawState && typeof global.SawState.getLatestPlans === "function") {
      const plans = global.SawState.getLatestPlans();
      return {
        packingLayout: plans.packingLayout || plans.latestPackingLayout || null,
        sawmillCutPlan: plans.sawmillCutPlan || plans.latestSawmillCutPlan || null,
      };
    }

    if (global.SawState) {
      return {
        packingLayout: typeof global.SawState.getLatestPackingLayout === "function"
          ? global.SawState.getLatestPackingLayout()
          : null,
        sawmillCutPlan: typeof global.SawState.getLatestSawmillCutPlan === "function"
          ? global.SawState.getLatestSawmillCutPlan()
          : null,
      };
    }

    return { packingLayout: null, sawmillCutPlan: null };
  }

  function fromLegacyGlobals() {
    let packingLayout = null;
    let sawmillCutPlan = null;

    try {
      if (typeof latestPackingLayout !== "undefined") packingLayout = latestPackingLayout;
      if (typeof latestSawmillCutPlan !== "undefined") sawmillCutPlan = latestSawmillCutPlan;
    } catch (e) {}

    if (!packingLayout && "latestPackingLayout" in global) {
      packingLayout = global.latestPackingLayout;
    }
    if (!sawmillCutPlan && "latestSawmillCutPlan" in global) {
      sawmillCutPlan = global.latestSawmillCutPlan;
    }

    return {
      packingLayout: packingLayout || null,
      sawmillCutPlan: sawmillCutPlan || null,
    };
  }

  function hasArrayItems(value) {
    return Array.isArray(value) && value.length > 0;
  }

  function hasPlans(plans) {
    return !!(plans && (hasArrayItems(plans.packingLayout) || hasArrayItems(plans.sawmillCutPlan)));
  }

  function getLatestPlans() {
    const statePlans = fromState();
    const legacyPlans = fromLegacyGlobals();

    if (!isViewModelModeEnabled() && hasPlans(legacyPlans)) return legacyPlans;
    if (hasPlans(statePlans)) return statePlans;
    return legacyPlans;
  }

  function hasLatestPlans() {
    return hasPlans(getLatestPlans());
  }

  function hasPackingLayout() {
    return hasArrayItems(getPackingLayout());
  }

  function hasSawmillCutPlan() {
    return hasArrayItems(getSawmillCutPlan());
  }

  function getPackingLayout() {
    return getLatestPlans().packingLayout || null;
  }

  function getSawmillCutPlan() {
    return getLatestPlans().sawmillCutPlan || null;
  }

  function setLatestPlans(packingLayout, sawmillCutPlan) {
    if (global.SawState && typeof global.SawState.setLatestPlans === "function") {
      global.SawState.setLatestPlans(packingLayout, sawmillCutPlan);
    }

    try {
      if (typeof latestPackingLayout !== "undefined") latestPackingLayout = packingLayout || null;
      if (typeof latestSawmillCutPlan !== "undefined") latestSawmillCutPlan = sawmillCutPlan || null;
    } catch (e) {}

    if ("latestPackingLayout" in global) global.latestPackingLayout = packingLayout || null;
    if ("latestSawmillCutPlan" in global) global.latestSawmillCutPlan = sawmillCutPlan || null;

    return getLatestPlans();
  }

  function resetLatestPlans() {
    if (global.SawState && typeof global.SawState.clearLatestPlans === "function") {
      global.SawState.clearLatestPlans();
    }

    try {
      if (typeof latestPackingLayout !== "undefined") latestPackingLayout = null;
      if (typeof latestSawmillCutPlan !== "undefined") latestSawmillCutPlan = null;
    } catch (e) {}

    if ("latestPackingLayout" in global) global.latestPackingLayout = null;
    if ("latestSawmillCutPlan" in global) global.latestSawmillCutPlan = null;

    return { packingLayout: null, sawmillCutPlan: null };
  }

  function clearLatestPlans() {
    return resetLatestPlans();
  }

  global.SawLatestPlans = {
    getLatestPlans,
    hasLatestPlans,
    hasPackingLayout,
    hasSawmillCutPlan,
    getPackingLayout,
    getSawmillCutPlan,
    setLatestPlans,
    clearLatestPlans,
    resetLatestPlans,
    fromState,
    fromLegacyGlobals,
  };

  global.getLatestSawPlans = getLatestPlans;
})(window);
