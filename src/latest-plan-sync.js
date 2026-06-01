// src/latest-plan-sync.js
// Synkar legacy-cache för packningslayout och sågverksplan till SawState.
//
// Detta är ett säkert första steg: legacy app.js fortsätter äga och använda
// latestPackingLayout/latestSawmillCutPlan. Den här modulen kopierar bara utfallet
// efter update() till SawState, så vi kan börja flytta läsningar senare.

(function installLatestPlanSync(global) {
  if (!global.SawState || typeof global.update !== "function") {
    console.warn("SawState eller update() saknas. latest-plan-sync aktiveras inte.");
    return;
  }

  const legacyUpdate = global.update;

  function syncLatestPlansToState() {
    try {
      global.SawState.setLatestPlans(
        typeof latestPackingLayout !== "undefined" ? latestPackingLayout : null,
        typeof latestSawmillCutPlan !== "undefined" ? latestSawmillCutPlan : null
      );
    } catch (error) {
      console.warn("Kunde inte synka latest plan-state till SawState.", error);
    }
  }

  global.update = function updateWithLatestPlanSync() {
    const result = legacyUpdate.apply(this, arguments);
    syncLatestPlansToState();
    return result;
  };

  // Synka initialt läge efter att alla moduler och fixar har laddats.
  syncLatestPlansToState();
})(window);
