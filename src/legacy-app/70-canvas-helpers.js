function rotatePoint(x, y, theta) {
  return {
    x: x * Math.cos(theta) - y * Math.sin(theta),
    y: x * Math.sin(theta) + y * Math.cos(theta),
  };
}

function rotatedRectBounds(r, theta) {
  const pts = [
    rotatePoint(r.x, r.y, theta),
    rotatePoint(r.x + r.w, r.y, theta),
    rotatePoint(r.x, r.y + r.h, theta),
    rotatePoint(r.x + r.w, r.y + r.h, theta),
  ];
  return {
    minX: Math.min(...pts.map(p => p.x)),
    maxX: Math.max(...pts.map(p => p.x)),
    minY: Math.min(...pts.map(p => p.y)),
    maxY: Math.max(...pts.map(p => p.y)),
    pts,
  };
}


function slabCutBoundaryForStep(step) {
  if (!step || !step.source || (step.kind !== "side" && step.kind !== "slab")) return null;
  const r = step.source;
  const phase = step.cutPhase || (step.kind === "slab" ? "outer" : "inner");

  // phase outer = första snittet som tar bort bark-/ytterdelen fram till plankans utsida.
  // phase inner = andra snittet, utan rotation, som frigör själva plankan.
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
  for (const c of cuts) {
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

function drawRemovedSlabs(ctx, cuts, R, scale) {
  // Ritar över bortsågad ytterzon i lokal, redan roterad kropp.
  ctx.save();
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;

  for (const c of cuts) {
    const v = c.value * scale;
    ctx.beginPath();
    if (c.axis === "y" && c.op === ">=") {
      ctx.rect(-R - 80, -R - 80, 2*(R+80), v + R + 80);
    } else if (c.axis === "y" && c.op === "<=") {
      ctx.rect(-R - 80, v, 2*(R+80), R + 80 - v);
    } else if (c.axis === "x" && c.op === ">=") {
      ctx.rect(-R - 80, -R - 80, v + R + 80, 2*(R+80));
    } else if (c.axis === "x" && c.op === "<=") {
      ctx.rect(v, -R - 80, R + 80 - v, 2*(R+80));
    }
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function remainingPackingBoundsWithSlabCuts(packingLayout, plan, stepIndex, rotationValue) {
  const cuts = completedSlabCuts(plan, stepIndex);
  const theta = rotationToRadians(rotationValue || 0);
  let maxY = -Infinity;

  for (const r of (packingLayout || [])) {
    // Hoppa över bitar som ligger utanför tidigare slabbsnitt.
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    if (!pointKeptBySlabCuts(cx, cy, cuts)) continue;

    const b = rotatedRectBounds(r, theta);
    maxY = Math.max(maxY, b.maxY);
  }

  return Number.isFinite(maxY) ? maxY : 0;
}
