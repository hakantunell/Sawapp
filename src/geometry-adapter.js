// src/geometry-adapter.js
// Första faktiska inkopplingen av geometry-modulen i befintlig app.
//
// Den gamla rotfilen app.js får ligga kvar tills vidare, men denna adapter ersätter
// computeGeometry med den centrala implementationen i SawGeometry.
// Det gör att vi kan flytta en funktion i taget utan att behöva skriva om hela app.js
// i samma steg.

(function installGeometryAdapter(global) {
  if (!global.SawGeometry) {
    console.warn("SawGeometry saknas. computeGeometry lämnas oförändrad.");
    return;
  }

  if (typeof global.computeGeometry === "function") {
    global.computeGeometryLegacy = global.computeGeometry;
  }

  global.computeGeometry = function computeGeometry(values) {
    return global.SawGeometry.computeLogGeometry(values);
  };

  // Räkna om direkt så att UI och sågplan använder adapter-versionen även efter sidladdning.
  if (typeof global.update === "function") {
    global.update();
  }
})(window);
