// src/timber-saw-list.js
// Passiv extraktion av legacy buildSawList().
//
// Modulen ändrar inte global buildSawList automatiskt. Den kapslar samma
// beräkningsflöde bakom SawTimberSawList.buildSawList() så att vi kan aktivera
// den kontrollerat via adapter senare.
//
// Viktigt: formler och stödlogik ska bevaras. Rätta inte gamla beräkningsbuggar
// i denna modul.

(function initSawTimberSawList(global) {
  function mmToIn(mm) {
    return Number(mm || 0) / 25.4;
  }

  function requiredHelper(name) {
    const fn = global[name];
    if (typeof fn !== "function") {
      throw new Error(`SawTimberSawList saknar legacy-hjälpare: ${name}`);
    }
    return fn;
  }

  function buildSawList(block, geom, v) {
    if (!block) return [];

    const getRotationSequence = requiredHelper("getRotationSequence");
    const sideForRotation = requiredHelper("sideForRotation");
    const completedCutPlanes = requiredHelper("completedCutPlanes");
    const shouldSupportOnBlockFace = requiredHelper("shouldSupportOnBlockFace");
    const blockBottomAfterRotation = requiredHelper("blockBottomAfterRotation");
    const retainedShapeBottomAfterRotation = requiredHelper("retainedShapeBottomAfterRotation");
    const blockTopAfterRotation = requiredHelper("blockTopAfterRotation");
    const downwardBlockFaceSide = requiredHelper("downwardBlockFaceSide");
    const completedSidesBeforeStep = requiredHelper("completedSidesBeforeStep");
    const supportHeightsForStep = requiredHelper("supportHeightsForStep");

    const rotations = getRotationSequence();
    const sawList = [];

    for (let idx = 0; idx < rotations.length; idx++) {
      const rot = rotations[idx];
      const rotationValue = ((rot % 360) + 360) % 360;
      const side = sideForRotation(rot);

      // Temporär lista med tidigare snitt används för att avgöra supportläge.
      const tempList = sawList.slice();
      const planes = completedCutPlanes(block, tempList, tempList.length);

      let supportBottom;
      if (shouldSupportOnBlockFace(block, tempList, tempList.length, rotationValue)) {
        supportBottom = blockBottomAfterRotation(block, rotationValue);
      } else {
        supportBottom = retainedShapeBottomAfterRotation(geom.designDiameter / 2, rotationValue, planes, 1);
      }

      const blockTop = blockTopAfterRotation(block, rotationValue);
      const bladeToBed = supportBottom - blockTop;

      const names = {
        top: "Övre sida",
        bottom: "Nedre sida",
        right: "Höger sida",
        left: "Vänster sida",
      };

      const downSide = downwardBlockFaceSide(rotationValue);
      const completed = completedSidesBeforeStep(tempList, tempList.length);
      const supportOnBlockFace = completed.has(downSide);
      const supportMode = supportOnBlockFace
        ? "Plan blockyta mot bädd"
        : (idx === 0 ? "Rundstock mot bädd" : "Kvarvarande rundstock/spill mot bädd");

      const step = {
        step: idx + 1,
        rotationValue,
        rotation: `${rot}°`,
        side,
        cut: names[side],
        isFirstCut: idx === 0,
        reference: supportMode,
        supportOnBlockFace,
        bladeToBed,
        bladeToBedIn: mmToIn(bladeToBed),
        finishedMeasure: side === "top" || side === "bottom" ? block.height : block.width,
        note: idx === 0
          ? "Första snittet skapar plan referensyta"
          : "Höjd beräknad från faktisk stödpunkt efter rotation",
      };

      const heights = supportHeightsForStep(step, block, v);
      step.rootSupportHeight = heights.root;
      step.topSupportHeight = heights.top;
      step.supportHeightAverage = heights.average;
      step.supportHeightDiff = heights.diff;
      sawList.push(step);
    }

    return sawList;
  }

  global.SawTimberSawList = {
    buildSawList,
  };

  global.buildTimberSawList = buildSawList;
})(window);
