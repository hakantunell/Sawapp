// src/timber-saw-list-adapter.js
// Adapter som kopplar legacy buildSawList() till SawTimberSawList.
//
// Aktiveras genom att laddas i bootstrapen. Den sparar legacy-funktionen som
// buildSawListLegacy och ersätter sedan global buildSawList med modulens
// implementation.

(function installTimberSawListAdapter(global) {
  if (global.__timberSawListAdapterInstalled) return;

  if (!global.SawTimberSawList || typeof global.SawTimberSawList.buildSawList !== "function") {
    console.warn("SawTimberSawList saknas. buildSawList lämnas oförändrad.");
    return;
  }

  if (typeof global.buildSawList === "function") {
    global.buildSawListLegacy = global.buildSawList;
  }

  global.__timberSawListAdapterInstalled = true;
  global.buildSawList = global.SawTimberSawList.buildSawList;

  if (typeof global.update === "function") {
    global.update();
  }
})(window);
