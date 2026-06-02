// src/render-common.js
// Gemensamma canvas-renderhjälpare.

(function initSawRenderCommon(global) {
  function drawBarkRing(ctx, outerR, barkThicknessPx) {
    const innerR = Math.max(0, outerR - barkThicknessPx);
    ctx.save();
    ctx.fillStyle = "#7c5a3a";
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#5b3d24";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  global.SawRenderCommon = {
    drawBarkRing,
  };

  if (typeof global.drawBarkRing === "function") {
    global.drawBarkRingLegacy = global.drawBarkRing;
    global.drawBarkRing = drawBarkRing;
  }

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
