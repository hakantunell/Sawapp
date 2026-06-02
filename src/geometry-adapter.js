// src/geometry-adapter.js
// Inkoppling av geometry-modulen i befintlig app.
//
// Den gamla rotfilen app.js får ligga kvar tills vidare, men denna adapter ersätter
// avgränsade rena geometrihjälpare med implementationer från SawGeometry.

(function installGeometryAdapter(global) {
  if (!global.SawGeometry) {
    console.warn("SawGeometry saknas. Geometrifunktioner lämnas oförändrade.");
    return;
  }

  if (typeof global.computeGeometry === "function") {
    global.computeGeometryLegacy = global.computeGeometry;
  }
  if (typeof global.sideForRotation === "function") {
    global.sideForRotationLegacy = global.sideForRotation;
  }

  global.computeGeometry = function computeGeometry(values) {
    return global.SawGeometry.computeLogGeometry(values);
  };

  global.sideForRotation = function sideForRotation(rotationValue) {
    return global.SawGeometry.sideForRotation(rotationValue);
  };

  // Räkna om direkt så att UI och sågplan använder adapter-versionerna även efter sidladdning.
  if (typeof global.update === "function") {
    global.update();
  }
})(window);
