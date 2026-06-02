// src/update-orchestrator.js
// Passiv update-orkestrator för den modulära renderkedjan.
//
// Den här modulen ersätter inte legacy update() automatiskt.
// Syftet är att kunna köra hela den nya ViewModel-baserade renderkedjan utan att
// först anropa legacy update(). När den är verifierad kan den senare användas av
// en adapter/feature-flag för att minska beroendet av app.js.

(function initSawUpdateOrchestrator(global) {
  function hasFunction(name) {
    return typeof global[name] === "function";
  }

  function updateFromViewModel() {
    if (!hasFunction("buildSawViewModel")) {
      console.warn("buildSawViewModel saknas. SawUpdateOrchestrator kan inte köra.");
      return null;
    }

    const model = global.buildSawViewModel();
    if (!model) return null;

    if (hasFunction("renderInputVisibility")) {
      global.renderInputVisibility();
    }

    if (model.mode === "sawmill") {
      if (hasFunction("renderPackingCanvas") && model.packingLayout) {
        global.renderPackingCanvas(
          model.block,
          model.geom,
          model.v,
          model.packingLayout,
          model.sawmillCutPlan,
          model.stepIndex
        );
      }

      if (hasFunction("renderSawmillCutPlan") && model.sawmillCutPlan) {
        global.renderSawmillCutPlan(model.sawmillCutPlan, model.stepIndex);
      }

      if (hasFunction("renderPackingResult")) {
        global.renderPackingResult(model.packingLayout);
      }
    } else {
      if (hasFunction("renderSideYield")) {
        global.renderSideYield(model.sideYield);
      }

      if (hasFunction("renderTimberSawList") && model.sawList) {
        global.renderTimberSawList(model.sawList);
      }

      if (hasFunction("renderTimberCanvasFromModel") && model.sawList) {
        global.renderTimberCanvasFromModel(model);
      }
    }

    if (hasFunction("renderMetrics")) {
      global.renderMetrics(model.geom, model.metrics);
    }

    if (hasFunction("renderCalcDetails")) {
      global.renderCalcDetails(model.geom, model.block, model.v);
    }

    if (hasFunction("renderBigScreenStep") && model.step) {
      global.renderBigScreenStep(model.step);
    }

    if (hasFunction("renderSawOrderStatus")) {
      global.renderSawOrderStatus(model);
    }

    if (hasFunction("renderSupportSideViewFromModel")) {
      global.renderSupportSideViewFromModel(model);
    }

    return model;
  }

  global.SawUpdateOrchestrator = {
    updateFromViewModel,
  };

  global.updateFromViewModel = updateFromViewModel;
})(window);
