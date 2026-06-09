function renderTimberCanvas(block, geom, v, sawList) {
  if (!window.SawTimberCanvasParts) {
    throw new Error("SawTimberCanvasParts saknas. Kontrollera laddordningen i src/app.js.");
  }

  const layout = window.SawTimberCanvasParts.buildTimberCanvasLayout(block, geom, v, sawList);
  if (!layout) return;

  const packingLayoutForCanvas = window.SawLatestPlans && typeof window.SawLatestPlans.getPackingLayout === "function"
    ? window.SawLatestPlans.getPackingLayout()
    : null;

  const ctx = layout.ctx;
  ctx.save();
  ctx.translate(layout.cx, layout.cy);

  window.SawTimberCanvasParts.drawTimberPhysicalBody(layout, block, v, packingLayoutForCanvas);
  window.SawTimberCanvasParts.drawTimberWaneLabel(layout, block);
  window.SawTimberCanvasParts.drawTimberBed(layout);
  window.SawTimberCanvasParts.drawTimberBladeAndSupports(layout);

  ctx.restore();
}
