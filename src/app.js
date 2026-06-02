// src/app.js
// Bootstrap för refaktoreringen.

(function bootstrapSawapp() {
  const scripts = [
    "src/version.js",
    "src/format.js",
    "src/dimension-label.js",
    "src/wane.js",
    "src/block-geometry.js",
    "src/dimension-resolver.js",
    "src/packing-dimensions.js",
    "src/side-yield.js",
    "src/state.js",
    "src/state-adapter.js",
    "src/inputs.js",
    "src/geometry.js",
    "src/dimensions.js",
    "app.js",
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
    "src/current-step-sync.js",
    "src/current-step-navigation-sync.js",
    "src/latest-plan-sync.js",
    "src/render-packing-canvas.js",
    "src/render-sawmill-cut-plan.js",
    "src/render-yield-results.js",
    "src/big-step-navigation-fix.js"
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
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