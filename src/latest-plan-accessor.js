// src/latest-plan-accessor.js
// Gemensam åtkomstpunkt för senaste sågverks-/packningsplan.
//
// Primär källa är SawState. Legacy-globals används bara som fallback under
// migrationen, tills latestPackingLayout/latestSawmillCutPlan kan tas bort helt
// från app.js.

(function initSawLatestPlanAccessor(global) {
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
    } catch (e) {
      // Ignorera om legacy-bindningen inte är åtkomlig.
    }

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

  function getLatestPlans() {
    const statePlans = fromState();
    if (statePlans.packingLayout || statePlans.sawmillCutPlan) return statePlans;
    return fromLegacyGlobals();
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

    // Spegla fortfarande till legacy-globals för kvarvarande app.js-kod.
    try {
      if (typeof latestPackingLayout !== "undefined") latestPackingLayout = packingLayout || null;
      if (typeof latestSawmillCutPlan !== "undefined") latestSawmillCutPlan = sawmillCutPlan || null;
    } catch (e) {
      // Ignorera om legacy-bindningen inte är åtkomlig.
    }

    if ("latestPackingLayout" in global) global.latestPackingLayout = packingLayout || null;
    if ("latestSawmillCutPlan" in global) global.latestSawmillCutPlan = sawmillCutPlan || null;

    return getLatestPlans();
  }

  function clearLatestPlans() {
    return setLatestPlans(null, null);
  }

  global.SawLatestPlans = {
    getLatestPlans,
    getPackingLayout,
    getSawmillCutPlan,
    setLatestPlans,
    clearLatestPlans,
    fromState,
    fromLegacyGlobals,
  };

  global.getLatestSawPlans = getLatestPlans;
})(window);
