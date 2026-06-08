function buildSawList(block, geom, v) {
  if (!block) return [];
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


function activeSideYieldDimensions() {
  return window.SawState.getDimensions().filter(d => d.active && (d.type === "freeWidth" || d.type === "minWidth" || d.wildEdge));
}


function activePackingDimensions() {
  return window.SawState.getDimensions()
    .filter(d => d.active)
    .map((d, index) => ({ ...d, priorityIndex: index }))
    .filter(d => {
      if (d.type === "fixed") return d.width > 0 && d.height > 0;
      if (d.type === "freeWidth") return d.height > 0;
      if (d.type === "minWidth") return d.height > 0 && (d.minWidth || d.width || 0) > 0;
      return false;
    });
}

function circleWidthAtY(y, R) {
  if (Math.abs(y) > R) return 0;
  return 2 * Math.sqrt(Math.max(0, R * R - y * y));
}

function dimensionToPackCandidate(d, geom, v) {
  const allowedWane = effectiveAllowedWaneForDimension(d, v);
  if (d.type === "fixed") {
    return { source: d, w: d.width, h: d.height, label: `${d.width}×${d.height}${d.wildEdge ? " R" : ""}`, allowedWane, type: d.type, priorityIndex: d.priorityIndex };
  }
  if (d.type === "freeWidth") {
    return { source: d, w: Math.floor(geom.usableDiameter), h: d.height, label: `${d.height}×*${d.wildEdge ? " R" : ""}`, allowedWane, type: d.type, priorityIndex: d.priorityIndex, freeWidth: true, minWidth: 1 };
  }
  if (d.type === "minWidth") {
    const minWidth = d.minWidth || d.width || 0;
    return { source: d, w: Math.floor(geom.usableDiameter), h: d.height, label: `${d.height}×${minWidth}+${d.wildEdge ? " R" : ""}`, allowedWane, type: d.type, priorityIndex: d.priorityIndex, freeWidth: true, minWidth };
  }
  return null;
}

function rectFitsCircle(rect, R, allowedWane = 0) {
  const corners = [[rect.x, rect.y], [rect.x+rect.w, rect.y], [rect.x, rect.y+rect.h], [rect.x+rect.w, rect.y+rect.h]];
  const allowedR = R + allowedWane;
  return corners.every(([x,y]) => Math.hypot(x,y) <= allowedR + 0.001);
}
