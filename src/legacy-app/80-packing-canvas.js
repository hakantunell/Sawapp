function renderPackingCanvas(block, geom, v, packingLayout, sawmillCutPlan) {
  if (!window.SawPackingCanvasParts) {
    throw new Error("SawPackingCanvasParts saknas. Kontrollera laddordningen i src/app.js.");
  }

  const layout = window.SawPackingCanvasParts.buildPackingCanvasLayout(geom, v, packingLayout, sawmillCutPlan);
  if (!layout) return;

  const ctx = layout.ctx;
  ctx.save();
  ctx.translate(layout.cx, layout.cy);

  window.SawPackingCanvasParts.drawPackingBody(layout, geom, v, packingLayout, sawmillCutPlan);
  window.SawPackingCanvasParts.drawPackingBed(layout);
  window.SawPackingCanvasParts.drawPackingBlade(layout);

  ctx.restore();
}
