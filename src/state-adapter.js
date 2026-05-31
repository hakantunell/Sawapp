// src/state-adapter.js
// Adapterhjälpare för gradvis migrering från legacy currentStepIndex till SawState.
//
// Den här filen ändrar ännu inte legacy app.js. Den exponerar små globala helper-
// funktioner som kan användas i nästa steg när vi ersätter lågrisk-referenser.

(function installStateAdapter(global) {
  if (!global.SawState) {
    console.warn("SawState saknas. State-adapter aktiveras inte.");
    return;
  }

  const state = global.SawState;

  global.getCurrentStepIndexFromState = function getCurrentStepIndexFromState() {
    return state.getCurrentStepIndex();
  };

  global.setCurrentStepIndexInState = function setCurrentStepIndexInState(index) {
    return state.setCurrentStepIndex(index);
  };

  global.resetCurrentStepIndexInState = function resetCurrentStepIndexInState() {
    return state.resetCurrentStepIndex();
  };

  global.moveCurrentStepIndexInState = function moveCurrentStepIndexInState(delta, planLength) {
    return state.moveCurrentStep(delta, planLength);
  };

  global.ensureCurrentStepIndexInStateRange = function ensureCurrentStepIndexInStateRange(planLength) {
    return state.ensureCurrentStepInRange(planLength);
  };
})(window);
