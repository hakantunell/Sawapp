// src/block-geometry-adapter.js
// Partiell adapter för blockgeometri.
//
// Endast de mest isolerade funktionerna kopplas om här:
// - completedSidesBeforeStep()
// - planeForSide()
//
// Mer känsliga funktioner som påverkar stöd-/rotations-/svärdslogik
// lämnas kvar i legacy app.js tills vidare.

(function installBlockGeometryAdapter(global) {
  if (!global.SawBlockGeometry) {
    console.warn("SawBlockGeometry saknas. Blockgeometrifunktioner lämnas oförändrade.");
    return;
  }

  const geometry = global.SawBlockGeometry;

  if (typeof global.completedSidesBeforeStep === "function") {
    global.completedSidesBeforeStepLegacy = global.completedSidesBeforeStep;
  }
  if (typeof global.planeForSide === "function") {
    global.planeForSideLegacy = global.planeForSide;
  }

  global.completedSidesBeforeStep = geometry.completedSidesBeforeStep;
  global.planeForSide = geometry.planeForSide;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
