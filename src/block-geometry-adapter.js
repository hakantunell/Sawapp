// src/block-geometry-adapter.js
// Adapter för blockgeometri.
//
// Funktionen kopplar om rena block-/rektangelhjalpare till SawBlockGeometry.
// Mer sammansatt stod-/rotationslogik, t.ex. retainedShapeBottomAfterRotation(),
// downwardBlockFaceSide() och shouldSupportOnBlockFace(), ligger kvar i legacy app.js.

(function installBlockGeometryAdapter(global) {
  if (!global.SawBlockGeometry) {
    console.warn("SawBlockGeometry saknas. Blockgeometrifunktioner lamnas oforandrade.");
    return;
  }

  const geometry = global.SawBlockGeometry;

  if (typeof global.rotatedPointY === "function") {
    global.rotatedPointYLegacy = global.rotatedPointY;
  }
  if (typeof global.blockBottomAfterRotation === "function") {
    global.blockBottomAfterRotationLegacy = global.blockBottomAfterRotation;
  }
  if (typeof global.blockTopAfterRotation === "function") {
    global.blockTopAfterRotationLegacy = global.blockTopAfterRotation;
  }
  if (typeof global.blockMinYAfterRotation === "function") {
    global.blockMinYAfterRotationLegacy = global.blockMinYAfterRotation;
  }
  if (typeof global.completedSidesBeforeStep === "function") {
    global.completedSidesBeforeStepLegacy = global.completedSidesBeforeStep;
  }
  if (typeof global.planeForSide === "function") {
    global.planeForSideLegacy = global.planeForSide;
  }

  global.rotatedPointY = geometry.rotatedPointY;
  global.blockBottomAfterRotation = geometry.blockBottomAfterRotation;
  global.blockTopAfterRotation = geometry.blockTopAfterRotation;
  global.blockMinYAfterRotation = geometry.blockMinYAfterRotation;
  global.completedSidesBeforeStep = geometry.completedSidesBeforeStep;
  global.planeForSide = geometry.planeForSide;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
