// src/app.js
// Steg 1 i refaktoreringen: index.html laddar bara denna fil.
//
// Detta är en bootstrap som laddar befintlig huvudkod och temporära fixar i korrekt ordning.
// Viktigt: sökvägarna nedan är relativa till index.html, inte till denna fil.
// Nästa steg blir att flytta logik från rotens app.js till funktionsvisa moduler under src/.

(function bootstrapSawapp() {
  const scripts = [
    "app.js",
    "fix-v36.js",
    "fix-v37.js",
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
