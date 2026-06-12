// src/geometry.js
// Gemensamma geometrifunktioner för Sawapp.
//
// Detta är första riktiga modulsteget i refaktoreringen.
// Filen ändrar inte befintligt beteende ännu. Den exponerar en samlad geometri-API
// under window.SawGeometry så att kommande steg kan flytta logik från rotens app.js
// utan att ändra UI eller sågplan i samma commit.

(function initSawGeometry(global) {
  function mmToIn(mm) {
    return mm / 25.4;
  }

  function fmtMm(value, decimals = 0) {
    return `${Number(value).toFixed(decimals)} mm`;
  }

  function fmtIn(value) {
    return `${mmToIn(value).toFixed(2)}"`;
  }

  function normalizeRotation(degrees) {
    return ((degrees || 0) % 360 + 360) % 360;
  }

  function rotationToRadians(rotationValue) {
    // Samma orientering som nuvarande app.js:
    // positiv sågrotation visas med negativ canvasvinkel.
    return -normalizeRotation(rotationValue) * Math.PI / 180;
  }

  function sideForRotation(rotationValue) {
    const norm = normalizeRotation(rotationValue);
    if (norm === 0) return "top";
    if (norm === 180) return "bottom";
    if (norm === 90) return "right";
    if (norm === 270) return "left";
    return "top";
  }

  function positiveNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function buildMeasuredDiameterPoints(v, supportDistance, overhangEachEnd) {
    const logLength = positiveNumber(v.logLength);
    const support1X = overhangEachEnd;
    const support2X = overhangEachEnd + supportDistance;

    return [
      { key: "rootEnd", label: "Rotända", x: 0, value: positiveNumber(v.rootEndDiameter) },
      { key: "support1", label: "Stöd 1", x: support1X, value: positiveNumber(v.rootDiameter) },
      { key: "support2", label: "Stöd 2", x: support2X, value: positiveNumber(v.topDiameter) },
      { key: "topEnd", label: "Toppända", x: logLength, value: positiveNumber(v.topEndDiameter) },
    ].filter((point) => point.value > 0 && Number.isFinite(point.x));
  }

  function farthestPointPair(points) {
    let best = null;
    let bestDistance = -1;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const distance = Math.abs(points[j].x - points[i].x);
        if (distance > bestDistance) {
          bestDistance = distance;
          best = [points[i], points[j]];
        }
      }
    }
    return best;
  }

  function interpolateProfile(v, supportDistance, overhangEachEnd) {
    const logLength = positiveNumber(v.logLength);
    const support1X = overhangEachEnd;
    const support2X = overhangEachEnd + supportDistance;
    const measured = buildMeasuredDiameterPoints(v, supportDistance, overhangEachEnd);
    const hasEnoughInput = logLength > 0 && measured.length >= 2;

    if (!hasEnoughInput) {
      const blank = [
        { key: "rootEnd", label: "Rotända", x: 0, value: positiveNumber(v.rootEndDiameter), source: positiveNumber(v.rootEndDiameter) ? "measured" : "missing" },
        { key: "support1", label: "Stöd 1", x: support1X, value: positiveNumber(v.rootDiameter), source: positiveNumber(v.rootDiameter) ? "measured" : "missing" },
        { key: "support2", label: "Stöd 2", x: support2X, value: positiveNumber(v.topDiameter), source: positiveNumber(v.topDiameter) ? "measured" : "missing" },
        { key: "topEnd", label: "Toppända", x: logLength, value: positiveNumber(v.topEndDiameter), source: positiveNumber(v.topEndDiameter) ? "measured" : "missing" },
      ];
      return {
        hasEnoughInput: false,
        measuredCount: measured.length,
        measured,
        points: blank,
        diameterAt: () => 0,
        taperPerMm: 0,
      };
    }

    const [a, b] = farthestPointPair(measured);
    const dx = b.x - a.x;
    const taperPerMm = dx === 0 ? 0 : (a.value - b.value) / dx;
    const slope = dx === 0 ? 0 : (b.value - a.value) / dx;
    const diameterAt = (x) => Math.max(0, a.value + slope * (x - a.x));
    const measuredByKey = new Map(measured.map((point) => [point.key, point]));

    const points = [
      { key: "rootEnd", label: "Rotända", x: 0 },
      { key: "support1", label: "Stöd 1", x: support1X },
      { key: "support2", label: "Stöd 2", x: support2X },
      { key: "topEnd", label: "Toppända", x: logLength },
    ].map((point) => {
      const measuredPoint = measuredByKey.get(point.key);
      return {
        ...point,
        value: measuredPoint ? measuredPoint.value : diameterAt(point.x),
        source: measuredPoint ? "measured" : "calculated",
      };
    });

    return {
      hasEnoughInput,
      measuredCount: measured.length,
      measured,
      points,
      diameterAt,
      taperPerMm,
      interpolationSource: { from: a.key, to: b.key },
    };
  }

  function computeLogGeometry(values) {
    const v = values || {};
    const supportDistance = Math.max(v.supportDistance || 1, 1);
    const logLength = positiveNumber(v.logLength);
    const overhangEachEnd = Math.max(0, (logLength - supportDistance) / 2);
    const profile = interpolateProfile(v, supportDistance, overhangEachEnd);

    const pointByKey = new Map(profile.points.map((point) => [point.key, point]));
    const rootEnd = pointByKey.get("rootEnd")?.value || 0;
    const support1Diameter = pointByKey.get("support1")?.value || 0;
    const support2Diameter = pointByKey.get("support2")?.value || 0;
    const topEnd = pointByKey.get("topEnd")?.value || 0;

    const minEnd = Math.min(
      support1Diameter || Infinity,
      support2Diameter || Infinity,
      rootEnd || Infinity,
      topEnd || Infinity
    );
    const safeMinEnd = profile.hasEnoughInput && Number.isFinite(minEnd) ? minEnd : 0;
    const designDiameter = Math.max(0, safeMinEnd - 2 * (v.sweep || 0));
    const usableDiameter = Math.max(0, designDiameter - 2 * ((v.bark || 0) + (v.margin || 0)));
    const avgD = profile.hasEnoughInput
      ? ((rootEnd + support1Diameter + support2Diameter + topEnd) / 4)
      : 0;
    const logVolume = Math.PI * Math.pow((avgD / 2) / 1000, 2) * (logLength / 1000);

    return {
      overhangEachEnd,
      taperPerMm: profile.taperPerMm,
      rootEnd,
      topEnd,
      minEnd: safeMinEnd,
      designDiameter,
      usableDiameter,
      logVolume,
      support1Diameter,
      support2Diameter,
      hasEnoughDiameterInput: profile.hasEnoughInput,
      measuredDiameterCount: profile.measuredCount,
      diameterProfile: profile.points,
      interpolationSource: profile.interpolationSource || null,
    };
  }

  function requiredDiagonalWithWane(width, height, allowedCornerWane) {
    return Math.max(0, Math.hypot(width, height) - 2 * (allowedCornerWane || 0));
  }

  function maxFreeWidthForThickness(thickness, geometry, allowedWane) {
    const availableDiag = (geometry?.usableDiameter || 0) + 2 * (allowedWane || 0);
    return Math.floor(Math.sqrt(Math.max(0, availableDiag * availableDiag - thickness * thickness)));
  }

  function rotatePoint(x, y, theta) {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return { x: x * c - y * s, y: x * s + y * c };
  }

  function rotatedRectBounds(rect, theta) {
    if (!rect) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, pts: [] };
    }

    const pts = [
      rotatePoint(rect.x, rect.y, theta),
      rotatePoint(rect.x + rect.w, rect.y, theta),
      rotatePoint(rect.x, rect.y + rect.h, theta),
      rotatePoint(rect.x + rect.w, rect.y + rect.h, theta),
    ];

    return {
      minX: Math.min(...pts.map(p => p.x)),
      maxX: Math.max(...pts.map(p => p.x)),
      minY: Math.min(...pts.map(p => p.y)),
      maxY: Math.max(...pts.map(p => p.y)),
      pts,
    };
  }

  global.SawGeometry = {
    mmToIn,
    fmtMm,
    fmtIn,
    normalizeRotation,
    rotationToRadians,
    sideForRotation,
    computeLogGeometry,
    requiredDiagonalWithWane,
    maxFreeWidthForThickness,
    rotatePoint,
    rotatedRectBounds,
  };
})(window);