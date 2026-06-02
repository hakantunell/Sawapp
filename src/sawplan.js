// src/sawplan.js
// Sågplansmotor för Sawapp.

(function initSawPlan(global) {
  function sideToRotation(side) {
    if (side === "top" || side === "över") return 0;
    if (side === "bottom" || side === "under") return 180;
    if (side === "right" || side === "höger") return 90;
    if (side === "left" || side === "vänster") return 270;
    return 0;
  }

  function inferPackingSide(piece) {
    if (piece.type === "center") return "center";
    if (piece.side) {
      if (piece.side === "över") return "top";
      if (piece.side === "under") return "bottom";
      if (piece.side === "höger") return "right";
      if (piece.side === "vänster") return "left";
      return piece.side;
    }
    const cx = piece.x + piece.w / 2;
    const cy = piece.y + piece.h / 2;
    if (Math.abs(cx) > Math.abs(cy)) return cx > 0 ? "right" : "left";
    return cy > 0 ? "bottom" : "top";
  }

  function completedPackingSources(plan, stepIndex) {
    const set = new Set();
    if (!plan) return set;
    for (let i = 0; i < stepIndex; i++) {
      const s = plan[i];
      if (s && s.kind === "side" && s.source) set.add(s.source);
    }
    return set;
  }

  function remainingPackingPieces(packingLayout, plan, stepIndex) {
    const done = completedPackingSources(plan, stepIndex);
    return (packingLayout || []).filter(p => !done.has(p));
  }

  function packingSupportBottomY(pieces, rotationValue) {
    if (!pieces || !pieces.length) return 0;
    const theta = global.rotationToRadians
      ? global.rotationToRadians(rotationValue || 0)
      : (global.SawGeometry ? global.SawGeometry.rotationToRadians(rotationValue || 0) : 0);
    let maxY = -Infinity;
    for (const r of pieces) {
      const b = global.rotatedRectBounds(r, theta);
      maxY = Math.max(maxY, b.maxY);
    }
    return Number.isFinite(maxY) ? maxY : 0;
  }

  function packingBladeYForStep(step) {
    if (!step || !step.source) return 0;
    const theta = global.rotationToRadians
      ? global.rotationToRadians(step.rotationValue || 0)
      : (global.SawGeometry ? global.SawGeometry.rotationToRadians(step.rotationValue || 0) : 0);
    const b = global.rotatedRectBounds(step.source, theta);

    if (step.kind === "slab") return b.minY;
    if (step.kind === "side") return b.maxY;
    if (step.side === "bottom") return b.maxY;
    return b.minY;
  }

  function slabCutBoundaryForStep(step) {
    if (!step || !step.source || (step.kind !== "side" && step.kind !== "slab")) return null;
    const r = step.source;
    const phase = step.cutPhase || (step.kind === "slab" ? "outer" : "inner");

    if (step.side === "top") {
      return phase === "outer"
        ? { axis: "y", op: ">=", value: r.y }
        : { axis: "y", op: ">=", value: r.y + r.h };
    }
    if (step.side === "bottom") {
      return phase === "outer"
        ? { axis: "y", op: "<=", value: r.y + r.h }
        : { axis: "y", op: "<=", value: r.y };
    }
    if (step.side === "right") {
      return phase === "outer"
        ? { axis: "x", op: "<=", value: r.x + r.w }
        : { axis: "x", op: "<=", value: r.x };
    }
    if (step.side === "left") {
      return phase === "outer"
        ? { axis: "x", op: ">=", value: r.x }
        : { axis: "x", op: ">=", value: r.x + r.w };
    }
    return null;
  }

  function completedSlabCuts(plan, stepIndex) {
    const cuts = [];
    if (!plan) return cuts;
    for (let i = 0; i < stepIndex; i++) {
      const c = slabCutBoundaryForStep(plan[i]);
      if (c) cuts.push(c);
    }
    return cuts;
  }

  function pointKeptBySlabCuts(x, y, cuts) {
    for (const c of cuts || []) {
      if (c.axis === "y") {
        if (c.op === ">=" && y < c.value - 0.001) return false;
        if (c.op === "<=" && y > c.value + 0.001) return false;
      } else {
        if (c.op === ">=" && x < c.value - 0.001) return false;
        if (c.op === "<=" && x > c.value + 0.001) return false;
      }
    }
    return true;
  }

  function remainingPackingBoundsWithSlabCuts(packingLayout, plan, stepIndex, rotationValue) {
    const cuts = completedSlabCuts(plan, stepIndex);
    const theta = global.rotationToRadians
      ? global.rotationToRadians(rotationValue || 0)
      : (global.SawGeometry ? global.SawGeometry.rotationToRadians(rotationValue || 0) : 0);
    let maxY = -Infinity;

    for (const r of (packingLayout || [])) {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      if (!pointKeptBySlabCuts(cx, cy, cuts)) continue;

      const b = global.rotatedRectBounds(r, theta);
      maxY = Math.max(maxY, b.maxY);
    }

    return Number.isFinite(maxY) ? maxY : 0;
  }

  function recalcSawmillPlanHeights(plan, packingLayout, v) {
    if (!plan || !packingLayout) return plan;
    const taperDiff = (v.rootDiameter - v.topDiameter) / 2;

    plan.forEach((step, idx) => {
      remainingPackingPieces(packingLayout, plan, idx);
      const supportBottom = remainingPackingBoundsWithSlabCuts(packingLayout, plan, idx, step.rotationValue || 0);
      const bladeY = packingBladeYForStep(step);
      const h = Math.max(0, supportBottom - bladeY);

      step.bladeToBed = h;
      if (idx === 0) {
        step.rootSupportHeight = h + taperDiff / 2;
        step.topSupportHeight = h - taperDiff / 2;
      } else {
        step.rootSupportHeight = h;
        step.topSupportHeight = h;
      }
    });

    return plan;
  }

  function buildSawmillCutPlan(packingLayout, block, geom, v) {
    if (!packingLayout || !packingLayout.length) return [];

    const sidePieces = packingLayout
      .filter(p => p.type !== "center")
      .map((p) => {
        const side = inferPackingSide(p);
        const thickness = Math.min(p.w, p.h);
        const length = Math.max(p.w, p.h);
        return {
          side,
          rotationValue: sideToRotation(side),
          rotation: `${sideToRotation(side)}°`,
          label: p.label || `${Math.round(thickness)}×${Math.round(length)}`,
          thickness,
          length,
          source: p,
        };
      });

    const sideOrder = { top: 0, bottom: 1, right: 2, left: 3 };
    sidePieces.sort((a, b) => (sideOrder[a.side] ?? 9) - (sideOrder[b.side] ?? 9));

    const steps = [];
    sidePieces.forEach((p) => {
      steps.push({
        kind: "slab",
        side: p.side,
        rotationValue: p.rotationValue,
        rotation: p.rotation,
        label: `ytterdel före ${p.label}`,
        thickness: p.thickness,
        length: p.length,
        note: "Ta bort ytterdelen/slabban först",
        source: p.source,
        cutPhase: "outer",
      });
      steps.push({
        kind: "side",
        side: p.side,
        rotationValue: p.rotationValue,
        rotation: p.rotation,
        label: p.label,
        thickness: p.thickness,
        length: p.length,
        note: "Utan rotation: såga loss plankan/sidobiten",
        source: p.source,
        cutPhase: "inner",
      });
    });

    const centerPiece = packingLayout.find(p => p.type === "center");
    const core = centerPiece || (block ? { x: -block.width / 2, y: -block.height / 2, w: block.width, h: block.height, label: `${block.width}×${block.height}` } : null);

    if (core) {
      const label = core.label || `${Math.round(core.w)}×${Math.round(core.h)}`;
      [
        { side: "top", rotationValue: 0, text: "övre sida" },
        { side: "bottom", rotationValue: 180, text: "nedre sida" },
        { side: "right", rotationValue: 90, text: "höger sida" },
        { side: "left", rotationValue: 270, text: "vänster sida" },
      ].forEach((s) => {
        steps.push({
          kind: "center",
          side: s.side,
          rotationValue: s.rotationValue,
          rotation: `${s.rotationValue}°`,
          label,
          thickness: s.side === "top" || s.side === "bottom" ? core.h : core.w,
          length: s.side === "top" || s.side === "bottom" ? core.w : core.h,
          rootSupportHeight: null,
          topSupportHeight: null,
          note: `Blocka kärnan sist – ${s.text}`,
          source: core,
        });
      });
    }

    steps.forEach((s, idx) => { s.step = idx + 1; });
    return recalcSawmillPlanHeights(steps, packingLayout, v);
  }

  global.SawPlan = {
    sideToRotation,
    inferPackingSide,
    completedPackingSources,
    remainingPackingPieces,
    packingSupportBottomY,
    packingBladeYForStep,
    slabCutBoundaryForStep,
    completedSlabCuts,
    pointKeptBySlabCuts,
    remainingPackingBoundsWithSlabCuts,
    recalcSawmillPlanHeights,
    buildSawmillCutPlan,
  };

  if (typeof global.sideToRotation === "function") global.sideToRotationLegacy = global.sideToRotation;
  if (typeof global.inferPackingSide === "function") global.inferPackingSideLegacy = global.inferPackingSide;
  if (typeof global.completedPackingSources === "function") global.completedPackingSourcesLegacy = global.completedPackingSources;
  if (typeof global.remainingPackingPieces === "function") global.remainingPackingPiecesLegacy = global.remainingPackingPieces;
  if (typeof global.packingSupportBottomY === "function") global.packingSupportBottomYLegacy = global.packingSupportBottomY;
  if (typeof global.packingBladeYForStep === "function") global.packingBladeYForStepLegacy = global.packingBladeYForStep;
  if (typeof global.slabCutBoundaryForStep === "function") global.slabCutBoundaryForStepLegacy = global.slabCutBoundaryForStep;
  if (typeof global.completedSlabCuts === "function") global.completedSlabCutsLegacy = global.completedSlabCuts;
  if (typeof global.pointKeptBySlabCuts === "function") global.pointKeptBySlabCutsLegacy = global.pointKeptBySlabCuts;
  if (typeof global.remainingPackingBoundsWithSlabCuts === "function") global.remainingPackingBoundsWithSlabCutsLegacy = global.remainingPackingBoundsWithSlabCuts;
  if (typeof global.recalcSawmillPlanHeights === "function") global.recalcSawmillPlanHeightsLegacy = global.recalcSawmillPlanHeights;

  global.sideToRotation = sideToRotation;
  global.inferPackingSide = inferPackingSide;
  global.completedPackingSources = completedPackingSources;
  global.remainingPackingPieces = remainingPackingPieces;
  global.packingSupportBottomY = packingSupportBottomY;
  global.packingBladeYForStep = packingBladeYForStep;
  global.slabCutBoundaryForStep = slabCutBoundaryForStep;
  global.completedSlabCuts = completedSlabCuts;
  global.pointKeptBySlabCuts = pointKeptBySlabCuts;
  global.remainingPackingBoundsWithSlabCuts = remainingPackingBoundsWithSlabCuts;
  global.recalcSawmillPlanHeights = recalcSawmillPlanHeights;

  if (typeof global.buildSawmillCutPlan === "function") {
    global.buildSawmillCutPlanLegacy = global.buildSawmillCutPlan;
    global.buildSawmillCutPlan = buildSawmillCutPlan;
  }

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
