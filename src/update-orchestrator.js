// src/update-orchestrator.js
// Update-orkestrator för den modulära renderkedjan.
//
// Orkestratorn äger inte längre en egen rendersekvens. Den återanvänder samma
// UpdateContext och SawUpdateRendering som legacy update()-flödet använder.

(function initSawUpdateOrchestrator(global) {
  function hasFunction(name) {
    return typeof global[name] === "function";
  }

  function buildContext() {
    if (global.SawUpdatePipeline && typeof global.SawUpdatePipeline.buildPlanContext === "function") {
      return global.SawUpdatePipeline.buildPlanContext();
    }

    if (hasFunction("buildSawViewModel") && global.SawUpdatePipeline && typeof global.SawUpdatePipeline.contextFromViewModel === "function") {
      return global.SawUpdatePipeline.contextFromViewModel(global.buildSawViewModel());
    }

    return null;
  }

  function renderContext(context) {
    if (!context) return null;

    if (hasFunction("renderDimensionsEditorFromState")) {
      global.renderDimensionsEditorFromState();
    } else if (hasFunction("renderDimensions")) {
      global.renderDimensions();
    }

    if (hasFunction("renderInputVisibility")) {
      global.renderInputVisibility();
    }

    if (global.SawUpdateRendering) {
      if (typeof global.SawUpdateRendering.renderSummary === "function") {
        global.SawUpdateRendering.renderSummary(context);
      }
      if (typeof global.SawUpdateRendering.renderOrderStatus === "function") {
        global.SawUpdateRendering.renderOrderStatus(context);
      }
      if (typeof global.SawUpdateRendering.renderAll === "function") {
        global.SawUpdateRendering.renderAll(context);
      }
      return context;
    }

    console.warn("SawUpdateRendering saknas. Kan inte köra modulär update-rendering.");
    return context;
  }

  function updateFromViewModel() {
    return renderContext(buildContext());
  }

  global.SawUpdateOrchestrator = {
    updateFromViewModel,
    buildContext,
    renderContext,
  };

  global.updateFromViewModel = updateFromViewModel;
})(window);
