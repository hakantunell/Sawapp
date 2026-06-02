// src/geometry-adapter.js
// Inkoppling av geometry-modulen i befintlig app.

(function installGeometryAdapter(global) {
  if (!global.SawGeometry) {
    console.warn("SawGeometry saknas. Geometrifunktioner lämnas oförändrade.");
    return;
  }

  if (typeof global.computeGeometry === "function") global.computeGeometryLegacy = global.computeGeometry;
  if (typeof global.sideForRotation === "function") global.sideForRotationLegacy = global.sideForRotation;
  if (typeof global.rotatePoint === "function") global.rotatePointLegacy = global.rotatePoint;
  if (typeof global.rotatedRectBounds === "function") global.rotatedRectBoundsLegacy = global.rotatedRectBounds;

  global.computeGeometry = function(values) {
    return global.SawGeometry.computeLogGeometry(values);
  };

  global.sideForRotation = function(rotationValue) {
    return global.SawGeometry.sideForRotation(rotationValue);
  };

  global.rotatePoint = function(x, y, theta) {
    return global.SawGeometry.rotatePoint(x, y, theta);
  };

  global.rotatedRectBounds = function(rect, theta) {
    return global.SawGeometry.rotatedRectBounds(rect, theta);
  };

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
