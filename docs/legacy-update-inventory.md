# Legacy `update()` inventory

Status: efter att ViewModel och majoriteten av renderers är aktiva via `src/update-render-extract-adapter.js`.

## Sammanfattning

Legacy `update()` gör fortfarande hela gamla beräknings- och renderpasset först. Därefter kör `update-render-extract-adapter.js` och renderar om flera UI-delar från `buildSawViewModel()`.

Det betyder att `update()` i nuläget innehåller både:

1. verkligt kvarvarande ansvar, och
2. renderkod som redan i praktiken skrivs över av den nya pipeline-kedjan.

## Legacy `update()` i grova steg

Nuvarande flöde i `app.js`:

```javascript
function update() {
  manualRotationWrap toggle
  renderDimensions()
  values()
  computeGeometry()
  findBestCenterBlock()
  buildSawList()
  computeSideYield()
  computeSawmillPacking()
  buildSawmillCutPlan()
  activePlanLength/currentStepIndex clamp
  metrics calculation
  metric DOM fields
  sawOrder card + prev/next buttons
  renderSupportSideView()
  calcDetails table
  latestPackingLayout/latestSawmillCutPlan assignment
  renderPackingResult() or renderSideYield()
  renderCanvas()
  renderSawmillCutPlan() or renderSawList()
  bigStep fields
}
```

## Delar som redan är ersatta/överskrivna av ny pipeline

Dessa renderdelar skrivs i praktiken över efter legacy `update()`:

### 1. Metrics

Legacy skriver:

- `designDiameter`
- `usableDiameter`
- `yieldPct`
- `sawnArea`
- `logVolume`

Ny pipeline:

- `renderMetrics(model.geom, model.metrics)`

Status: kan senare tas bort från legacy `update()` när vi ersätter update direkt.

### 2. Saw order/status card

Legacy skriver `sawOrder` direkt.

Ny pipeline:

- `renderSawOrderStatus(model)`

Status: ersatt i praktiken.

### 3. Support side view

Legacy anropar:

- `renderSupportSideView(displayStepForSupport, geom)`

Ny pipeline:

- `renderSupportSideViewFromModel(model)`

Status: ersatt i praktiken.

### 4. Calc details

Legacy skriver `calcDetails.innerHTML` direkt.

Ny pipeline:

- `renderCalcDetails(model.geom, model.block, model.v)`

Status: ersatt i praktiken.

### 5. Saw list

Legacy anropar:

- `renderSawmillCutPlan(sawmillCutPlan)`
- fallback `renderSawList(sawList)`

Ny pipeline:

- sawmill-läget hanteras av utbruten sawmill renderer via tidigare adapterkedja
- timmerläget hanteras av `renderTimberSawList(model.sawList)`

Status: delvis ersatt. Kontrollera sawmill-läge extra innan legacy-tabellrenderingen tas bort.

### 6. Big screen fields

Legacy skriver:

- `bigStep`
- `bigHeight`
- `bigRotation`
- `bigReference`

Ny pipeline:

- `renderBigScreenStep(model.step)`

Status: ersatt i praktiken.

### 7. Timber canvas

Legacy anropar:

- `renderCanvas(block, geom, v, sawList)`

Ny pipeline:

- `renderTimberCanvasFromModel(model)` för timmerläge

Status: timmerläge ersatt via wrapper. Sawmill/packing canvas bör betraktas som kvarvarande legacy tills separat verifierad.

## Delar som fortfarande verkar ha verkligt ansvar

### 1. Manual rotation visibility

Legacy gör:

```javascript
$("manualRotationWrap").classList.toggle("hidden", $("rotationPreset").value !== "manual");
```

Det finns ingen separat modul för detta ännu.

Rekommendation: extrahera som liten UI-state-renderer, exempelvis:

```text
src/render-input-visibility.js
```

### 2. Dimension rendering entrypoint

Legacy anropar fortfarande `renderDimensions()`.

Men `renderDimensions()` är nu patchad via `dimensions-editor-activation-adapter.js` till state-baserad editor.

Status: kvar i update-flödet men inte längre egentlig legacy-rendering.

### 3. latestPackingLayout/latestSawmillCutPlan

Legacy sätter:

```javascript
latestPackingLayout = packingLayout;
latestSawmillCutPlan = sawmillCutPlan;
```

ViewModel sätter också senaste planer via `SawState.setLatestPlans(...)` och försöker spegla globalerna om de finns.

Status: delvis redundant men bör inte tas bort förrän globalberoenden är inventerade.

### 4. Packing result / side yield panel

Legacy anropar:

```javascript
if (packingLayout) renderPackingResult(packingLayout); else renderSideYield(sideYield);
```

Det finns redan utbrutna renderers för packning/sidoutbyte sedan tidigare, men kontrollera om de är fullständigt inkopplade via adapter innan legacy-anrop tas bort.

Status: potentiellt ersatt, men bör verifieras.

### 5. Canvas i sawmill/packing-läge

Legacy `renderCanvas()` väljer:

```javascript
if (latestPackingLayout && latestPackingLayout.length) renderPackingCanvas(...)
else renderTimberCanvas(...)
```

Ny pipeline renderar timmercanvas från model, men packing canvas bör betraktas som känsligt område.

Status: kvarvarande legacyområde.

## Eventhantering efter `update()`

Utanför `update()` finns fortfarande legacy-event:

- input/change listeners för alla indatafält
- `addDimension`
- `presetTimber`
- print/copy
- big screen open
- big prev/next
- tabs

Viktig observation:

`bigPrev` och `bigNext` använder variabeln `activePlanLength`, men den är lokal i `update()` enligt nuvarande kodstruktur. Detta kan vara ett gammalt dolt fel eller hanteras av senare patchar. Rör inte detta utan separat analys.

## Rekommenderad nästa refaktoreringsordning

### Steg 1: Extrahera manual rotation visibility

Låg risk.

Föreslagen fil:

```text
src/render-input-visibility.js
```

Föreslagen funktion:

```javascript
renderInputVisibility()
```

Den kan köras från render-adaptern eller separat input-adapter.

### Steg 2: Verifiera och eventuellt koppla packing/side-yield panel till ViewModel

Måttlig risk.

Målet är att all panelrendering använder `model.sideYield` och `model.packingLayout`.

### Steg 3: Hantera sawmill/packing canvas separat

Högre risk.

Den bör inte blandas med vanlig timmercanvas eftersom kända/oklara buggar redan finns i sawmill/packing-läget.

### Steg 4: Ersätt legacy `update()` med ny orchestrator

Hög risk.

Gör först när alla DOM-sektioner som `update()` skriver antingen:

- har en aktiv renderer, eller
- är medvetet kvar som legacyansvar.

## Rekommenderad kortsiktig slutsats

Nästa säkra kodsteg bör vara:

```text
src/render-input-visibility.js
```

Det är liten yta, låg risk och tar bort ännu ett verkligt ansvar från legacy `update()`.
