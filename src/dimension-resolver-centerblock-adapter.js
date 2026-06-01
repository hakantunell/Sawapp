// src/dimension-resolver-centerblock-adapter.js
// Adapter som kopplar legacy findBestCenterBlock() till SawDimensionResolver.
//
// Detta är första flytten av centrumblocksvalet. Den påverkar optimeringslogik,
// men inte canvasrendering, stödberäkning, rotation eller svärdsposition direkt.

(function installCenterBlockResolverAdapter(global) {
  if (!global.SawDimensionResolver || typeof global.SawDimensionResolver.findBestCenterBlockFromDom !== "function") {
    console.warn("SawDimensionResolver saknar findBestCenterBlockFromDom. findBestCenterBlock lämnas oförändrad.");
    return;
  }

  if (typeof global.findBestCenterBlock === "function") {
    global.findBestCenterBlockLegacy = global.findBestCenterBlock;
  }

  global.findBestCenterBlock = global.SawDimensionResolver.findBestCenterBlockFromDom;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
