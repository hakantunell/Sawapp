// src/block-geometry.js
// Rena block-/rektangelgeometrifunktioner.
//
// Detta är bara förberedande modulering. Funktionen laddas/aktiveras inte ännu.
// Flera av funktionerna används nära stöd-/rotationslogiken och ska därför kopplas
// in separat och försiktigt efter visuell kontroll.

(function initSawBlockGeometry(global) {
  function blockCorners(block) {
    if (!block) return [];
    return [
      [-block.width / 2, -block.height / 2],
      [ block.width / 2, -block.height / 2],
      [ block.width / 2,  block.height / 2],
      [-block.width / 2,  block.height / 2],
    ];
  }

  function rotationToRadians(rotationValue) {
    if (global.SawRotation && typeof global.SawRotation.rotationToRadians === "function") {
      return global.SawRotation.rotationToRadians(rotationValue);
    }
    return -(rotationValue || 0) * Math.PI / 180;
  }

  function rotatedPointY(x, y, rotationValue) {
    const theta = rotationToRadians(rotationValue || 0);
    return x * Math.sin(theta) + y * Math.cos(theta);
  }

  function blockBottomAfterRotation(block, rotationValue) {
    const corners = blockCorners(block);
    if (!corners.length) return 0;
    return Math.max(...corners.map(([x, y]) => rotatedPointY(x, y, rotationValue)));
  }

  function blockTopAfterRotation(block, rotationValue) {
    const corners = blockCorners(block);
    if (!corners.length) return 0;
    return Math.min(...corners.map(([x, y]) => rotatedPointY(x, y, rotationValue)));
  }

  function blockMinYAfterRotation(block, rotationValue) {
    return blockTopAfterRotation(block, rotationValue);
  }

  function planeForSide(side, block) {
    if (!block) return null;
    if (side === "top") return { axis: "y", op: ">=", value: -block.height / 2 };
    if (side === "bottom") return { axis: "y", op: "<=", value: block.height / 2 };
    if (side === "right") return { axis: "x", op: "<=", value: block.width / 2 };
    if (side === "left") return { axis: "x", op: ">=", value: -block.width / 2 };
    return null;
  }

  function completedSidesBeforeStep(sawList, currentStepIndex) {
    const sides = new Set();
    const list = Array.isArray(sawList) ? sawList : [];
    for (let i = 0; i < currentStepIndex; i++) {
      if (list[i]?.side) sides.add(list[i].side);
    }
    return sides;
  }

  global.SawBlockGeometry = {
    blockCorners,
    rotatedPointY,
    blockBottomAfterRotation,
    blockTopAfterRotation,
    blockMinYAfterRotation,
    planeForSide,
    completedSidesBeforeStep,
  };
})(window);
