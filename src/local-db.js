// src/local-db.js
// Lokal lagring för app-inställningar och dimensioner.
//
// Beräkningsdata och aktuella stockmått sparas inte här. Syftet är att de
// inställningar som normalt görs en gång ska finnas kvar när appen startas igen.

(function initSawLocalDb(global) {
  const STORAGE_KEY = "sawapp.localdb.v1";

  const settingIds = [
    "sawModel",
    "supportDistance",
    "bladeHeightDisplay",
    "bark",
    "kerf",
    "margin",
    "cornerWane",
    "profileRadius",
    "rotationPreset",
    "manualRotation",
    "optimizationMode",
  ];

  function $(id) {
    return global.document.getElementById(id);
  }

  function readRecord() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.warn("Kunde inte läsa lokal Sawapp-data.", error);
      return {};
    }
  }

  function writeRecord(record) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      return true;
    } catch (error) {
      console.warn("Kunde inte spara lokal Sawapp-data.", error);
      return false;
    }
  }

  function normalizeLengthPct(value) {
    const pct = Number(value);
    return Number.isFinite(pct) && pct > 0 ? Math.max(1, Math.min(100, pct)) : 100;
  }

  function normalizeDimension(d) {
    if (!d || typeof d !== "object") return null;
    return {
      active: Boolean(d.active),
      type: ["fixed", "freeWidth", "minWidth"].includes(d.type) ? d.type : "fixed",
      width: Number(d.width) || 0,
      height: Number(d.height) || 0,
      minWidth: Number(d.minWidth) || 0,
      wildEdge: Boolean(d.wildEdge),
      waneMm: Number(d.waneMm) || 0,
      lengthPct: normalizeLengthPct(d.lengthPct),
    };
  }

  function collectSettings() {
    const settings = {};
    for (const id of settingIds) {
      const el = $(id);
      if (!el) continue;
      settings[id] = el.value;
    }
    return settings;
  }

  function collectDimensions() {
    if (!global.SawState || typeof global.SawState.getDimensions !== "function") return null;
    return global.SawState.getDimensions()
      .map(normalizeDimension)
      .filter(Boolean);
  }

  function save() {
    const previous = readRecord();
    const dimensions = collectDimensions();
    const next = {
      ...previous,
      version: 1,
      savedAt: new Date().toISOString(),
      settings: collectSettings(),
      dimensions: dimensions || previous.dimensions || [],
    };
    return writeRecord(next);
  }

  function restoreSettings(record) {
    const settings = record && record.settings;
    if (!settings || typeof settings !== "object") return;

    for (const id of settingIds) {
      const el = $(id);
      if (!el || settings[id] === undefined) continue;
      el.value = settings[id];
    }
  }

  function restoreDimensions(record) {
    const dimensions = record && Array.isArray(record.dimensions)
      ? record.dimensions.map(normalizeDimension).filter(Boolean)
      : [];

    if (!dimensions.length) return;
    if (!global.SawState || typeof global.SawState.setDimensions !== "function") return;

    global.SawState.setDimensions(dimensions);
  }

  function restore() {
    const record = readRecord();
    restoreSettings(record);
    restoreDimensions(record);
    return record;
  }

  function scheduleSave() {
    global.setTimeout(save, 0);
  }

  function attachListeners() {
    for (const id of settingIds) {
      const el = $(id);
      if (!el) continue;
      el.addEventListener("input", scheduleSave);
      el.addEventListener("change", scheduleSave);
    }

    const dimensionList = $("dimensionList");
    if (dimensionList) {
      dimensionList.addEventListener("input", scheduleSave, true);
      dimensionList.addEventListener("change", scheduleSave, true);
      dimensionList.addEventListener("click", scheduleSave, true);
    }

    const addDimension = $("addDimension");
    if (addDimension) addDimension.addEventListener("click", scheduleSave, true);

    const presetTimber = $("presetTimber");
    if (presetTimber) presetTimber.addEventListener("click", scheduleSave, true);

    global.addEventListener("beforeunload", save);
  }

  function clear() {
    global.localStorage.removeItem(STORAGE_KEY);
  }

  global.SawLocalDb = {
    restore,
    save,
    clear,
    storageKey: STORAGE_KEY,
  };

  restore();
  attachListeners();
})(window);
