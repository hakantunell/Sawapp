// src/current-step-state-bridge.js
// Första riktiga läsningen från SawState för currentStepIndex.
//
// Legacy app.js har fortfarande en lexikal variabel `currentStepIndex`.
// Eftersom alla skript körs i samma globala script-miljö kan ett senare skript
// läsa och skriva den bindningen direkt. Den här bryggan gör SawState till
// källan inför update(), men låter legacy update() fortsätta rendera som tidigare.
//
// Viktigt: reset-/navigation-sync laddas före denna fil så SawState hinner ändras
// innan legacy event handlers anropar update().

(function installCurrentStepStateBridge(global) {
  if (!global.SawState || typeof global.update !== "function") {
    console.warn("SawState eller update() saknas. current-step-state-bridge aktiveras inte.");
    return;
  }

  const legacyUpdate = global.update;

  global.update = function updateWithStateBridge() {
    try {
      // Gör SawState till källa inför renderingen.
      currentStepIndex = global.SawState.getCurrentStepIndex();
    } catch (error) {
      console.warn("Kunde inte läsa currentStepIndex från SawState före update().", error);
    }

    const result = legacyUpdate.apply(this, arguments);

    try {
      // Legacy update kan fortfarande nollställa index om planlängden ändrats.
      // Synka därför tillbaka utfallet efter renderingen.
      global.SawState.setCurrentStepIndex(currentStepIndex);
    } catch (error) {
      console.warn("Kunde inte synka currentStepIndex till SawState efter update().", error);
    }

    return result;
  };

  // Synka initialt läge utan att trigga extra rendering.
  try {
    global.SawState.setCurrentStepIndex(currentStepIndex);
  } catch (error) {
    console.warn("Kunde inte initiera currentStepIndex-bryggan.", error);
  }
})(window);
