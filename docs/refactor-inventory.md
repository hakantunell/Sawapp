# Sawapp refactor inventory

Syfte: visa vad som fortfarande bor i `app.js` efter moduluppdelningen och vad som redan är flyttat.

## Aktivt flyttade områden

### Geometri

Aktivt via moduler/adaptrar:

- `computeGeometry()` → `src/geometry.js`
- `rotationToRadians()` → `src/geometry.js`
- `sideForRotation()` → `src/geometry.js`
- `rotatePoint()` → `src/geometry.js`
- `rotatedRectBounds()` → `src/geometry.js`
- flera blockgeometrifunktioner → `src/block-geometry.js`

Legacy-kod finns fortfarande kvar i `app.js`, men används i praktiken inte för dessa funktioner när adaptrarna är laddade.

### Dimensionslogik

Aktivt via moduler/adaptrar:

- `dimensionLabel()` → `src/dimension-label.js` / `src/dimensions.js`
- `effectiveAllowedWaneForDimension()` → `src/wane.js` / `src/dimensions.js`
- `effectiveCornerWane()` → `src/wane.js` / `src/dimensions.js`
- `requiredDiagonalWithWane()` → modul
- `maxFreeWidthForThickness()` → modul
- `resolveDimensionCandidate()` → modul
- `findBestCenterBlock()` → `src/dimension-resolver.js` via `SawState`

### State

Aktivt:

- `SawState.currentStepIndex`
- `SawState.latestPackingLayout`
- `SawState.latestSawmillCutPlan`
- `SawState.dimensions`

Bryggor:

- `src/current-step-sync.js`
- `src/current-step-navigation-sync.js`
- `src/latest-plan-sync.js`
- `src/dimensions-state-sync.js`

Viktigt: legacy `dimensions` finns kvar lexikalt i `app.js` och används fortfarande av dimensionseditorn. `SawState.dimensions` synkas från DOM efter `renderDimensions()`.

### Packnings-/sidoutbytesdimensioner

Aktivt via `src/packing-dimensions.js`:

- `activePackingDimensions()`
- `activeSideYieldDimensions()`
- `circleWidthAtY()`
- `dimensionToPackCandidate()`
- `rectFitsCircle()`

### Sidoutbyte

Aktivt via `src/side-yield.js`:

- `computeSideYield()`

### Sågplansmotor

Aktivt via `src/sawplan.js`:

- `sideToRotation()`
- `inferPackingSide()`
- `completedPackingSources()`
- `remainingPackingPieces()`
- `packingSupportBottomY()`
- `packingBladeYForStep()`
- `slabCutBoundaryForStep()`
- `completedSlabCuts()`
- `pointKeptBySlabCuts()`
- `remainingPackingBoundsWithSlabCuts()`
- `recalcSawmillPlanHeights()`
- `buildSawmillCutPlan()`

V36-logiken för rund kropp mot bädd är också överförd till den aktiva packningsrenderern.

### Rendering

Aktivt via moduler:

- `renderPackingCanvas()` → `src/render-packing-canvas.js`
- `renderSawmillCutPlan()` → `src/render-sawmill-cut-plan.js`
- `renderPackingResult()` → `src/render-yield-results.js`
- `renderSideYield()` → `src/render-yield-results.js`
- `drawBarkRing()` → `src/render-common.js`

## Större delar som fortfarande ligger kvar i app.js

### 1. Dimensionseditorn

Fortfarande legacy:

- `renderDimensions()`
- flytta upp/flytta ner
- aktivera/avaktivera dimension
- ändra dimensionstyp
- ändra höjd/bredd/vankant/vildmark
- `addDimension`
- `presetTimber`

Risknivå: högre än tidigare steg, eftersom den muterar den lexikala `dimensions`-arrayen och samtidigt driver DOM/state-synken.

Rekommenderad väg:

1. Skapa `src/dimensions-editor.js` som ren renderer/controller.
2. Låt den först använda callbacks mot legacy `dimensions`.
3. Flytta därefter `dimensions` till `SawState` som primär källa.
4. Ta bort DOM-synken när editorn skriver direkt till state.

### 2. `update()`

Fortfarande legacy-controller.

Innehåller fortfarande orkestrering av:

- läsa inputs via `values()`
- beräkna geometri
- välja block
- bygga såglista
- beräkna sidoutbyte
- beräkna sågverkslayout
- bygga sågverksplan
- uppdatera nyckeltal
- rendera order/status
- rendera support side view
- rendera kalkyldetaljer
- spara latest-plan state
- rendera canvas/tabeller/resultat
- uppdatera storskärm

Risknivå: medel. Beräkningarna är i stor utsträckning moduliserade, men funktionen håller ihop hela UI-flödet.

Rekommenderad väg:

1. Extrahera små renderdelar från `update()`, inte hela funktionen direkt.
2. Kandidater:
   - `renderMetrics(geom, block, sideArea, sawnArea, yieldPct)`
   - `renderSawOrderStatus(block, step, sawmillCutPlan, sideYield, activePlanLength)`
   - `renderCalcDetails(geom, block, values)`
   - `renderBigScreenStep(step)`
3. Därefter kan `update()` bli en tydlig orkestrator.

### 3. Timmer-/legacy såglista

Fortfarande i `app.js`:

- `buildSawList()`
- `renderSawList()`
- `renderTimberCanvas()`
- `renderCanvas()` wrapper
- stöd-/klippfunktioner kopplade till timmerläge

Risknivå: medel till hög. Dessa påverkar timmerläget snarare än sågverks-/packningsläget.

Rekommenderad väg:

- Flytta inte detta samtidigt som dimensionseditorn.
- Börja med ren rendering:
  - `renderSawList()`
  - `renderSupportSideView()`
- Flytta `buildSawList()` senare, efter separat verifiering av timmerläge.

### 4. Event handlers och navigation

Fortfarande i `app.js`:

- input/change handlers för alla fält
- `printSawList`
- `copySawList`
- `openBigScreen`
- `bigPrevStep`
- `bigNextStep`
- `setupTabs()`

Risknivå: låg till medel.

Rekommenderad väg:

- Flytta till `src/ui-events.js` när `update()` är stabilare.
- Big screen navigation bör först korrigeras så att den använder aktiv planlängd från `SawState`, inte lokal/oklar variabel.

## Rekommenderad nästa ordning

1. Extrahera `renderCalcDetails()` från `update()`.
2. Extrahera `renderBigScreenStep()` från `update()`.
3. Extrahera `renderMetrics()` från `update()`.
4. Extrahera `renderSawOrderStatus()` från `update()`.
5. Därefter titta på `renderDimensions()`.

Skäl: dessa steg minskar `update()` utan att röra den känsliga dimensionseditorn.

## Viktig lärdom från render-packing-canvas

När en modul ersätter en legacy-funktion måste alla senare fixar för den funktionen flyttas med.

Exempel:

- `src/render-packing-canvas.js` aktiverades först med äldre renderlogik.
- Det återinförde ett gammalt fel där stocken hamnade fel mot bädden.
- Felet löstes genom att föra över v36-logiken till modulen.

Regel framåt:

> Innan en renderer eller större funktion aktiveras: jämför alltid mot senaste fixfilerna (`fix-v36.js`, `fix-v37.js`, `fix-v38.js`) så att inte gamla buggar återkommer.
