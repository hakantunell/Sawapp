// src/app.js
// Bootstrap för refaktoreringen.
//
// index.html laddar bara denna fil. Den laddar sedan moduler och befintlig huvudkod
// i en kontrollerad ordning. Sökvägarna är relativa till index.html.

(function bootstrapSawapp() {
  const scripts = [
    "src/version.js",
    "src/state.js",
    "src/state-adapter.js",
    "src/inputs.js",
    "src/geometry.js",
    "src/dimensions.js",
    "app.js",
    "src/inputs-adapter.js",
    "src/geometry-adapter.js",
    "src/dimensions-adapter.js",
    "src/sawplan.js",
    "fix-v36.js",
    "fix-v37.js",
    "src/current-step-sync.js",
    "src/current-step-navigation-sync.js"
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Kunde inte ladda ${src}`));
      document.body.appendChild(script);
    });
  }

  scripts
    .reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve())
    .catch((error) => {
      console.error("Sawapp bootstrap-fel:", error);
      const fallback = document.createElement("div");
      fallback.style.cssText = "margin:1rem;padding:1rem;border:1px solid #ef4444;background:#fee2e2;color:#7f1d1d;border-radius:8px";
      fallback.textContent = `Fel vid laddning av appen: ${error.message}`;
      document.body.prepend(fallback);
    });
})();
