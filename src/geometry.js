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

  function computeLogGeometry(values) {
    const v = values || {};
    const supportDistance = Math.max(v.supportDistance || 1, 1);
    const support1Diameter = v.rootDiameter || 0;
    const support2Diameter = v.topDiameter || 0;
    const overhangEachEnd = Math.max(0, ((v.logLength || 0) - supportDistance) / 2);

    let rootEnd = v.rootEndDiameter || 0;
    let topEnd = v.topEndDiameter || 0;

    if (!(rootEnd > 0 && topEnd > 0)) {
      const taperPerMm = (support1Diameter - support2Diameter) / supportDistance;
      rootEnd = support1Diameter + taperPerMm * overhangEachEnd;
      topEnd = support2Diameter - taperPerMm * overhangEachEnd;
    }

    const minEnd = Math.min(
      support1Diameter || Infinity,
      support2Diameter || Infinity,
      rootEnd || Infinity,
      topEnd || Infinity
    );
    const safeMinEnd = Number.isFinite(minEnd) ? minEnd : Math.min(support1Diameter, support2Diameter);
    const designDiameter = Math.max(0, safeMinEnd - 2 * (v.sweep || 0));
    const usableDiameter = Math.max(0, designDiameter - 2 * ((v.bark || 0) + (v.margin || 0)));
    const avgD = ((support1Diameter + support2Diameter) / 2) || designDiameter;
    const logVolume = Math.PI * Math.pow((avgD / 2) / 1000, 2) * ((v.logLength || 0) / 1000);

    return {
      overhangEachEnd,
      taperPerMm: (support1Diameter - support2Diameter) / supportDistance,
      rootEnd,
      topEnd,
      minEnd: safeMinEnd,
      designDiameter,
      usableDiameter,
      logVolume,
      support1Diameter,
      support2Diameter,
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
