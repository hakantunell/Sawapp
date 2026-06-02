# Dimensions editor transition

## Bakgrund

Den nya dimensionseditorn finns nu i två delar:

- `src/dimensions-editor.js`
- `src/dimensions-editor-adapter.js`

Den nya kedjan är:

```text
SawState
  ↓
dimensions-editor-adapter
  ↓
dimensions-editor
  ↓
DOM
```

## Viktig begränsning

Legacy `app.js` har fortfarande `dimensions` som en lexikal variabel.

Det betyder att externa moduler inte kan läsa eller skriva den direkt via `window.dimensions`.

Konsekvens:

- Den nya editorn kan uppdatera `SawState.dimensions`.
- Men flera legacy-flöden använder fortfarande den lexikala `dimensions`-arrayen.
- Om den nya editorn aktiveras som full ersättning innan legacy-arrayen är exponerad eller flyttad, kan UI:t se rätt ut medan beräkningarna fortfarande använder gamla värden.

Det vore en farlig regression eftersom ändringar i dimensionseditorn då inte säkert påverkar sågresultatet.

## Nuvarande säkra läge

Följande är färdigt men passivt:

- `renderDimensionsEditor(...)`
- `renderDimensionsEditorFromState(...)`
- `SawState.patchDimension(...)`
- `SawState.moveDimension(...)`

Följande legacy-flöde är fortfarande aktivt:

- `renderDimensions()` i `app.js`
- dess closures mot lexikal `dimensions`
- `dimensions-state-sync.js`, som läser DOM efter legacy-rendering och synkar till `SawState`

Det innebär att `SawState` just nu är en spegling av legacy-UI:t, inte primär källa.

## Rekommenderad nästa tekniska ändring

För att aktivera den nya dimensionseditorn säkert behövs ett av följande:

### Alternativ A: Exponera legacy-dimensions kontrollerat

Lägg till små funktioner i `app.js`, nära där `dimensions` är definierad:

```javascript
window.getLegacyDimensions = function getLegacyDimensions() {
  return dimensions;
};

window.setLegacyDimensions = function setLegacyDimensions(nextDimensions) {
  dimensions = Array.isArray(nextDimensions)
    ? nextDimensions.map(d => ({ ...d }))
    : [];
};
```

Därefter kan `dimensions-editor-adapter.js` skriva både till:

- `SawState`
- legacy `dimensions`

innan `update()` körs.

### Alternativ B: Flytta primär dimensions-state till SawState

Ändra alla legacy-funktioner som läser `dimensions` så att de i stället läser:

```javascript
SawState.getDimensions()
```

Detta är renare på sikt, men mer riskfyllt i ett steg eftersom flera äldre funktioner fortfarande är beroende av den lexikala variabeln.

## Rekommendation

Ta alternativ A först.

Det är ett litet, kontrollerat brosteg som gör att den nya editorn kan aktiveras utan att ändra alla legacy-beräkningar samtidigt.

När den nya editorn har verifierats kan man därefter börja flytta läsningen från legacy `dimensions` till `SawState` funktion för funktion.

## Princip

Aktivera inte den nya dimensionseditorn som ersättning för legacy-editorn förrän ändringar säkert påverkar samma dimensionskälla som beräkningarna använder.
