// src/side-yield.js
// Beräkning av förenklat sidoutbyte runt valt centrumblock.

(function initSawSideYield(global) {
  function activeSideYieldDimensions() {
    if (global.SawPackingDimensions && typeof global.SawPackingDimensions.activeSideYieldDimensionsFromGlobal === "function") {
      return global.SawPackingDimensions.activeSideYieldDimensionsFromGlobal();
    }
    if (typeof global.activeSideYieldDimensions === "function") {
      return global.activeSideYieldDimensions();
    }
    return [];
  }

  function computeSideYield(block, geom, values) {
    if (!block) return [];

    const sideDims = activeSideYieldDimensions();
    if (!sideDims.length) return [];

    const R = geom.usableDiameter / 2;
    const candidates = [];
    const sides = [
      { name: "övre sida", orientation: "horizontal", y: -block.height / 2 },
      { name: "nedre sida", orientation: "horizontal", y: block.height / 2 },
      { name: "höger sida", orientation: "vertical", x: block.width / 2 },
      { name: "vänster sida", orientation: "vertical", x: -block.width / 2 },
    ];

    for (const side of sides) {
      for (const d of sideDims) {
        const thickness = d.height || 0;
        if (thickness <= 0) continue;

        let availableLength = 0;
        let availableDepth = 0;

        if (side.orientation === "horizontal") {
          const yOuter = side.y < 0 ? side.y - thickness : side.y + thickness;
          const yCheck = Math.abs(yOuter);
          if (yCheck > R) continue;
          availableLength = 2 * Math.sqrt(Math.max(0, R * R - yCheck * yCheck));
          availableDepth = Math.max(0, R - Math.abs(side.y));
        } else {
          const xOuter = side.x < 0 ? side.x - thickness : side.x + thickness;
          const xCheck = Math.abs(xOuter);
          if (xCheck > R) continue;
          availableLength = 2 * Math.sqrt(Math.max(0, R * R - xCheck * xCheck));
          availableDepth = Math.max(0, R - Math.abs(side.x));
        }

        const width = Math.floor(availableLength);
        const minWidth = d.type === "minWidth" ? (d.minWidth || d.width || 0) : 0;
        if (minWidth && width < minWidth) continue;

        const edgeNote = d.wildEdge ? "råkant/vankant tillåten" : "renare kant";
        const label = d.type === "minWidth"
          ? `${thickness} × ${width} mm (${minWidth}+${d.wildEdge ? " R" : ""})`
          : `${thickness} × ${width} mm${d.wildEdge ? " R" : ""}`;

        candidates.push({
          side: side.name,
          thickness,
          width,
          minWidth,
          wildEdge: !!d.wildEdge,
          label,
          edgeNote,
          availableDepth: Math.floor(availableDepth),
        });
      }
    }

    const selected = [];
    const usedSides = new Set();
    for (const d of sideDims) {
      const matching = candidates
        .filter(c => !usedSides.has(c.side) && c.thickness === d.height && c.wildEdge === !!d.wildEdge)
        .sort((a, b) => b.width - a.width);
      if (matching[0]) {
        selected.push(matching[0]);
        usedSides.add(matching[0].side);
      }
    }

    return selected;
  }

  global.SawSideYield = {
    computeSideYield,
  };

  if (typeof global.computeSideYield === "function") {
    global.computeSideYieldLegacy = global.computeSideYield;
    global.computeSideYield = computeSideYield;
  }

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
