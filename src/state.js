// src/state.js
// Gemensamt state-lager för kommande refaktorering.
//
// Den här modulen tar successivt över runtime-state från legacy app.js.
// currentStepIndex är nu bryggad via current-step-state-bridge.js.

(function initSawState(global) {
  const defaultDimensions = [
    { active: true, type: "fixed", width: 190, height: 190, minWidth: 190, wildEdge: false, waneMm: 0 },
    { active: true, type: "fixed", width: 170, height: 170, minWidth: 170, wildEdge: false, waneMm: 0 },
    { active: false, type: "fixed", width: 150, height: 150, minWidth: 150, wildEdge: false, waneMm: 0 },
    { active: false, type: "freeWidth", width: 0, height: 50, minWidth: 0, wildEdge: false, waneMm: 0 },
    { active: false, type: "freeWidth", width: 0, height: 30, minWidth: 0, wildEdge: false, waneMm: 0 },
    { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: false, waneMm: 0 },
    { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: true, waneMm: 20 },
  ];

  const state = {
    currentStepIndex: 0,
    latestPackingLayout: null,
    latestSawmillCutPlan: null,
    dimensions: defaultDimensions.map(d => ({ ...d })),
  };

  function getState() {
    return state;
  }

  function getDimensions() {
    return state.dimensions;
  }

  function setDimensions(nextDimensions) {
    state.dimensions = Array.isArray(nextDimensions)
      ? nextDimensions.map(d => ({ ...d }))
      : [];
    return state.dimensions;
  }

  function updateDimension(index, patch) {
    if (!state.dimensions[index]) return null;
    state.dimensions[index] = { ...state.dimensions[index], ...(patch || {}) };
    return state.dimensions[index];
  }

  function resetDimensions() {
    state.dimensions = defaultDimensions.map(d => ({ ...d }));
    return state.dimensions;
  }

  function getCurrentStepIndex() {
    return state.currentStepIndex;
  }

  function setCurrentStepIndex(index) {
    state.currentStepIndex = Math.max(0, Number(index) || 0);
    return state.currentStepIndex;
  }

  function resetCurrentStepIndex() {
    return setCurrentStepIndex(0);
  }

  function moveCurrentStep(delta, planLength) {
    const length = Math.max(1, Number(planLength) || 1);
    state.currentStepIndex = (state.currentStepIndex + Number(delta || 0) + length) % length;
    return state.currentStepIndex;
  }

  function ensureCurrentStepInRange(planLength) {
    const length = Math.max(0, Number(planLength) || 0);
    if (length <= 0 || state.currentStepIndex >= length) {
      state.currentStepIndex = 0;
    }
    return state.currentStepIndex;
  }

  function getLatestPackingLayout() {
    return state.latestPackingLayout;
  }

  function setLatestPackingLayout(layout) {
    state.latestPackingLayout = layout || null;
    return state.latestPackingLayout;
  }

  function getLatestSawmillCutPlan() {
    return state.latestSawmillCutPlan;
  }

  function setLatestSawmillCutPlan(plan) {
    state.latestSawmillCutPlan = plan || null;
    return state.latestSawmillCutPlan;
  }

  function setLatestPlans(packingLayout, sawmillCutPlan) {
    state.latestPackingLayout = packingLayout || null;
    state.latestSawmillCutPlan = sawmillCutPlan || null;
    return {
      latestPackingLayout: state.latestPackingLayout,
      latestSawmillCutPlan: state.latestSawmillCutPlan,
    };
  }

  function clearLatestPlans() {
    return setLatestPlans(null, null);
  }

  global.SawState = {
    getState,
    getDimensions,
    setDimensions,
    updateDimension,
    resetDimensions,
    getCurrentStepIndex,
    setCurrentStepIndex,
    resetCurrentStepIndex,
    moveCurrentStep,
    ensureCurrentStepInRange,
    getLatestPackingLayout,
    setLatestPackingLayout,
    getLatestSawmillCutPlan,
    setLatestSawmillCutPlan,
    setLatestPlans,
    clearLatestPlans,
  };
})(window);
