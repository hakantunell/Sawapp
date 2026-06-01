// src/dimension-resolver-adapter.js
// Adapter som kopplar legacy resolveDimensionCandidate() till SawDimensionResolver.
//
// Detta påverkar dimensions-/optimeringslogik, men inte canvasrendering,
// stödberäkning, rotation eller svärdsposition direkt.

(function installDimensionResolverAdapter(global) {
  if (!global.SawDimensionResolver || typeof global.SawDimensionResolver.resolveDimensionCandidate !== "function") {
    console.warn("SawDimensionResolver saknas. resolveDimensionCandidate lämnas oförändrad.");
    return;
  }

  if (typeof global.resolveDimensionCandidate === "function") {
    global.resolveDimensionCandidateLegacy = global.resolveDimensionCandidate;
  }

  global.resolveDimensionCandidate = global.SawDimensionResolver.resolveDimensionCandidate;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
