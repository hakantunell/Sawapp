// src/default-dimensions.js
// Standarddimensioner för Sawapp.
//
// Detta är den gemensamma källan för default-listan som tidigare fanns både i
// app.js och implicit i SawState.

(function initSawDefaultDimensions(global) {
  const defaultDimensions = [
    { active: true, type: "fixed", width: 190, height: 190, minWidth: 190, wildEdge: false, waneMm: 0 },
    { active: true, type: "fixed", width: 170, height: 170, minWidth: 170, wildEdge: false, waneMm: 0 },
    { active: false, type: "fixed", width: 150, height: 150, minWidth: 150, wildEdge: false, waneMm: 0 },
    { active: false, type: "freeWidth", width: 0, height: 50, minWidth: 0, wildEdge: false, waneMm: 0 },
    { active: false, type: "freeWidth", width: 0, height: 30, minWidth: 0, wildEdge: false, waneMm: 0 },
    { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: false, waneMm: 0 },
    { active: false, type: "minWidth", width: 150, height: 30, minWidth: 150, wildEdge: true, waneMm: 20 },
  ];

  function cloneDimension(d) {
    return { ...(d || {}) };
  }

  function getDefaultDimensions() {
    return defaultDimensions.map(cloneDimension);
  }

  global.SawDefaultDimensions = {
    getDefaultDimensions,
  };
})(window);
