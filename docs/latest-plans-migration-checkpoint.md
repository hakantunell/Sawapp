# Latest plans migration checkpoint

Den här filen beskriver aktuell status för migreringen bort från direkta legacy-globals:

```js
latestPackingLayout
latestSawmillCutPlan
```

## Klart

Följande lager använder nu SawLatestPlans/SawState som åtkomstpunkt:

- `src/latest-plan-accessor.js`
- `src/latest-plan-sync.js`
- `src/render-canvas-latest-plan-adapter.js`
- `src/render-packing-canvas.js`
- `src/render-sawmill-cut-plan.js`
- `src/render-timber-canvas.js`
- `src/view-model.js`

## Kvar i app.js

Följande direkta användningar är identifierade i `app.js`.

### Deklaration

```js
let latestPackingLayout = null;
let latestSawmillCutPlan = null;
```

### Läsning i renderCanvas

```js
function renderCanvas(block, geom, v, sawList) {
  if (latestPackingLayout && latestPackingLayout.length) {
    renderPackingCanvas(block, geom, v, latestPackingLayout, latestSawmillCutPlan);
    return;
  }
  renderTimberCanvas(block, geom, v, sawList);
}
```

### Skrivning i update

```js
latestPackingLayout = packingLayout;
latestSawmillCutPlan = sawmillCutPlan;
```

## Nuvarande runtime-brygga

`src/render-canvas-latest-plan-adapter.js` ersätter `renderCanvas()` efter att `app.js` har laddats.

Adaptern använder i första hand färska legacy-värden via:

```js
SawLatestPlans.fromLegacyGlobals()
```

och faller därefter tillbaka till:

```js
SawLatestPlans.getLatestPlans()
```

Detta är avsiktligt eftersom `app.js` fortfarande skriver legacy-värdena inne i `update()` innan `latest-plan-sync` körs efter `update()`.

## Diagnostik i browser

Kör:

```js
latestPlanSyncDiagnostics()
```

för att kontrollera legacy/state/accessor.

Kör:

```js
renderCanvasPlanDiagnostics()
```

för att kontrollera vilken källa canvas-adaptern väljer.

## Nästa kodändring

Nästa faktiska refaktoreringssteg bör vara att ändra `app.js` kirurgiskt:

1. Ersätt `renderCanvas()` med en delegat till `SawRenderCanvasLatestPlanAdapter.renderCanvasViaLatestPlans(...)`, eller flytta samma logik direkt till `app.js`.
2. Ersätt skrivningen i `update()` med `SawLatestPlans.setLatestPlans(packingLayout, sawmillCutPlan)`.
3. När allt är verifierat: ta bort `latestPackingLayout` och `latestSawmillCutPlan`.

Gör endast ett av dessa steg per commit och testa i browser mellan varje steg.
