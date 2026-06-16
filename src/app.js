// src/app.js
// Bootstrap för refaktoreringen.

(function bootstrapSawapp() {
  const APP_BUILD = "1.2.18";
  const scripts = [
    "src/version.js",
    "src/format.js",
    "src/dimension-label.js",
    "src/wane.js",
    "src/block-geometry.js",
    "src/dimension-resolver.js",
    "src/packing-dimensions.js",
    "src/side-yield.js",
    "src/default-dimensions.js",
    "src/state.js",
    "src/latest-plan-accessor.js",
    "src/state-adapter.js",
    "src/inputs.js",
    "src/geometry.js",
    "src/dimensions.js",
    "src/render-sawmill-cut-plan.js",
    "src/render-timber-saw-list.js",
    "src/render-support-side-view.js",
    "src/legacy-app/00-core.js",
    "src/legacy-app/10-cut-geometry.js",
    "src/legacy-app/20-saw-list.js",
    "src/legacy-app/30-sawmill-packing.js",
    "src/legacy-app/40-packing-plan.js",
    "src/legacy-app/50-renderers.js",
    "src/timber-canvas-parts.js",
    "src/legacy-app/60-timber-canvas.js",
    "src/legacy-app/70-canvas-helpers.js",
    "src/packing-canvas-parts.js",
    "src/packing-canvas-blade-fix.js",
    "src/legacy-app/80-packing-canvas.js",
    "src/format-adapter.js",
    "src/dimension-label-adapter.js",
    "src/wane-adapter.js",
    "src/block-geometry-adapter.js",
    "src/dimension-resolver-adapter.js",
    "src/dimension-resolver-centerblock-adapter.js",
    "src/packing-dimensions-adapter.js",
    "src/inputs-adapter.js",
    "src/geometry-adapter.js",
    "src/dimensions-adapter.js",
    "src/dimensions-state-sync.js",
    "src/sawplan.js",
    "fix-v36.js",
    "fix-v37.js",
    "fix-v38.js",
    "fix-v39.js",
    "fix-v40.js",
    "fix-v41.js",
    "src/current-step-sync.js",
    "src/current-step-navigation-sync.js",
    "src/latest-plan-sync.js",
    "src/render-common.js",
    "src/render-packing-canvas.js",
    "src/render-yield-results.js",
    "src/render-calc-details.js",
    "src/render-metrics.js",
    "src/render-saw-order-status.js",
    "src/render-timber-canvas.js",
    "src/render-canvas-latest-plan-adapter.js",
    "src/render-input-visibility.js",
    "src/timber-saw-list.js",
    "src/timber-saw-list-adapter.js",
    "src/view-model.js",
    "src/update-orchestrator.js",
    "src/legacy-app/91-update-pipeline.js",
    "src/legacy-app/92-update-rendering.js",
    "src/work-screen.js",
    "src/blade-height-display-adapter.js",
    "src/local-db.js",
    "src/legacy-app/90-update.js",
    "src/dimensions-editor.js",
    "src/dimension-length-requirement-adapter.js",
    "src/dimensions-editor-adapter.js",
    "src/dimensions-editor-activation-adapter.js",
    "src/production-log.js",
    "src/free-saw.js",
    "src/big-step-navigation-fix.js",
    "src/voice-input.js",
    "src/voice-feedback.js",
    "src/voice-speech-settings.js",
    "src/voice-speech-feedback.js",
    "fix-v42.js",
    "fix-v43.js",
    "fix-v44.js"
  ];

  function withBuildVersion(src) {
    return `${src}${src.includes("?") ? "&" : "?"}v=${encodeURIComponent(APP_BUILD)}`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = withBuildVersion(src);
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Kunde inte ladda " + src));
      document.body.appendChild(script);
    });
  }

  scripts
    .reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve())
    .catch((error) => {
      console.error("Sawapp bootstrap-fel:", error);
      const fallback = document.createElement("div");
      fallback.style.cssText = "margin:1rem;padding:1rem;border:1px solid #ef4444;background:#fee2e2;color:#7f1d1d;border-radius:8px";
      fallback.textContent = "Fel vid laddning av appen: " + error.message;
      document.body.prepend(fallback);
    });
})();