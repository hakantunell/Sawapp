# Refaktorering – kartläggning av `app.js`

Syfte: skapa en säker väg från en stor `app.js` till funktionsvisa moduler utan att ändra beteende i samma steg.

Nuvarande läge:

```text
index.html
src/app.js                 bootstrap
src/geometry.js            ny geometri-modul
src/geometry-adapter.js    kopplar om computeGeometry()
app.js                     legacy-huvudfil, ca 1893 rader
fix-v36.js                 temporär fix för sågvy/svärd
fix-v37.js                 temporär fix för kerf/planksnitt
```

## Föreslagen slutstruktur

```text
src/
  app.js                   bootstrap / init
  state.js                 globalt tillstånd, dimensioner, currentStep
  dom.js                   $, values(), små DOM-hjälpare
  geometry.js              ren geometri och koordinater
  dimensions.js            dimensionsmodell, vankant, fri bredd, kandidatval
  packing.js               packning av centrumblock och sidobitar
  sawplan.js               sågordning, steg, kerf, stödhöjder
  render/
    canvas.js              canvas/sågbild
    sawlist.js             såglistetabell
    dimensions.js          dimensionsrader
    metrics.js             beräkningspanel
  ui.js                    tabs, knappar, event wiring
  adapters/
    geometry-adapter.js    temporär adapter under migrering
```

## Inventering av `app.js`

### 1. Grundhjälpare, UI-start och state

Ungefärligt område: rader 1–37.

Innehåll:

- `$()` DOM-hjälpare
- `mmToIn()`
- `fmtMm()`
- `fmtIn()`
- `setupTabs()`
- `currentStepIndex`
- `latestPackingLayout`
- `latestSawmillCutPlan`
- `dimensions`

Målmoduler:

```text
src/dom.js
src/state.js
src/ui.js
```

Rekommenderad migrering:

1. Flytta formattering till `geometry.js` eller `dom.js`.
2. Flytta `dimensions` och current-step-state till `state.js`.
3. Flytta `setupTabs()` till `ui.js`.

Risk: låg. Detta är mest struktur och UI-state.

---

### 2. Inläsning av formulärvärden och stockgeometri

Ungefärligt område: rader 38–89.

Innehåll:

- `values()`
- `computeGeometry()`

Nuvarande status:

- `src/geometry.js` innehåller `SawGeometry.computeLogGeometry()`.
- `src/geometry-adapter.js` ersätter legacy `computeGeometry()` med `SawGeometry.computeLogGeometry()`.

Målmoduler:

```text
src/dom.js      values()
src/geometry.js computeLogGeometry()
```

Rekommenderad migrering:

1. Låt adaptern ligga kvar tills hela appen fungerar stabilt.
2. Flytta `values()` till `dom.js` senare, men inte samtidigt som sågplanen ändras.

Risk: låg/medel. `values()` används överallt och bör flyttas separat.

---

### 3. Dimensioner, vankant och kandidatval

Ungefärligt område: rader 93–193.

Innehåll:

- `dimensionLabel()`
- `effectiveAllowedWaneForDimension()`
- `maxFreeWidthForThickness()`
- `resolveDimensionCandidate()`
- `effectiveCornerWane()`
- `requiredDiagonalWithWane()`
- `findBestCenterBlock()`

Målmodul:

```text
src/dimensions.js
```

Kommentar:

Detta är ganska avgränsat och är bra nästa modul efter geometri.

Rekommenderad migrering:

1. Skapa `src/dimensions.js`.
2. Exponera `window.SawDimensions`.
3. Lägg först in kopior av rena funktioner.
4. Koppla via adapter på samma sätt som `geometry-adapter.js`.

Risk: medel. Dessa funktioner påverkar både vanligt blockläge och sågverk/packning.

---

### 4. Rotation och klassisk blocksågning

Ungefärligt område: rader 195–450.

Innehåll:

- `getRotationSequence()`
- `sideForRotation()`
- `rotationToRadians()`
- `retainedLogCutY()`
- `completedCutPlanes()`
- `pointInsideCompletedCuts()`
- `planeForSide()`
- `rotatedPointY()`
- `blockBottomAfterRotation()`
- `blockTopAfterRotation()`
- `completedSidesBeforeStep()`
- `downwardBlockFaceSide()`
- `shouldSupportOnBlockFace()`
- `supportBottomForStep()`
- `buildSawList()`

Målmoduler:

```text
src/geometry.js      rotation, punkt/rect-geometri
src/sawplan.js       buildSawList(), supportlogik
```

Kommentar:

Detta område är känsligt eftersom det styr stödlogik, rotation och referensytor. Flyttas efter dimensionsmodulen.

Risk: hög. Ändra inte samtidigt som kerf-logiken.

---

### 5. Packning och sidoutbyte

Ungefärligt område: rader 451–900.

Innehåll:

- `activeSideYieldDimensions()`
- `activePackingDimensions()`
- `circleWidthAtY()`
- `dimensionToPackCandidate()`
- `rectFitsCircle()`
- `computeSawmillPacking()`
- sidobitslogik runt centrumblock
- sidoutbytesberäkning

Målmoduler:

```text
src/packing.js
src/dimensions.js
```

Kommentar:

Detta är hjärtat för “Sågverk / packning”. Här ligger mycket av den logik som påverkar vilka plankor som skapas runt blocket.

Risk: hög. Flyttas efter att `dimensions.js` är stabil.

---

### 6. Sågverksplan, kerf och steghöjder

Ungefärligt område: rader 901–1120.

Innehåll:

- `sideToRotation()`
- `inferPackingSide()`
- `completedPackingSources()`
- `remainingPackingPieces()`
- `packingSupportBottomY()`
- `packingBladeYForStep()`
- `recalcSawmillPlanHeights()`
- `buildSawmillCutPlan()`

Målmodul:

```text
src/sawplan.js
```

Kommentar:

Detta är den viktigaste modulen att få ren. Här bör kerf-regeln centraliseras:

```text
yttersnitt = frigöringssnitt + planktjocklek + kerf
```

Samma modell ska användas av både såglista och rendering. Nuvarande `fix-v36.js` och `fix-v37.js` ska på sikt ersättas av ren logik här.

Risk: mycket hög. Görs först när geometri/dimensioner/packing är separerade.

---

### 7. Rendera såglista och dimensioner

Ungefärligt område: rader 1120–1350.

Innehåll:

- `renderSawmillCutPlan()`
- `renderDimensions()`
- eventhantering för dimensionsrader

Målmoduler:

```text
src/render/sawlist.js
src/render/dimensions.js
src/ui.js
```

Kommentar:

Detta är UI-tung kod. Bör flyttas efter att datamodellerna är tydliga.

Risk: medel. Kan skapa UI-buggar men bör inte påverka beräkningslogiken om datan inte ändras.

---

### 8. Canvas och visuell stock/sågvy

Ungefärligt område: rader 1350–1700+.

Innehåll:

- `renderPackingCanvas()`
- `rotatePoint()`
- `rotatedRectBounds()`
- `slabCutBoundaryForStep()`
- `completedSlabCuts()`
- `pointKeptBySlabCuts()`
- `drawRemovedSlabs()`
- `remainingPackingBoundsWithSlabCuts()`
- svärdsritning och stödmåttsvisualisering

Målmoduler:

```text
src/geometry.js
src/render/canvas.js
```

Kommentar:

Här ska rendering bara använda färdiga värden från sågplanen. Den ska inte ha egen affärslogik för kerf eller snitthöjd.

Viktig målprincip:

```text
Såglistans stödmått och den röda svärdslinjen ska komma från samma step-värden.
```

Risk: hög. Visualisering har tidigare varit en källa till fel.

---

### 9. Update-loop, metrics, storskärm och init

Ungefärligt område: sista delen av filen.

Innehåll:

- huvudfunktionen `update()`
- rendering av metrics
- knapphantering
- storskärmsvy
- initiering vid sidladdning

Målmoduler:

```text
src/app.js
src/ui.js
src/render/metrics.js
src/render/bigscreen.js
```

Risk: medel. `update()` bör vara kvar tills övriga moduler är stabila, därefter kan den bli orchestration-kod.

---

## Rekommenderad arbetsordning

### Fas 1 – Säker modulgrund

Status: påbörjad.

- [x] `src/app.js` bootstrap
- [x] `src/geometry.js`
- [x] `src/geometry-adapter.js`
- [ ] `src/dimensions.js`
- [ ] `src/dimensions-adapter.js`

### Fas 2 – Flytta rena beräkningar

- Flytta vankant och dimensionskandidater.
- Flytta enkla rotations-/rektangel-funktioner.
- Inga ändringar i kerf eller sågplan ännu.

### Fas 3 – Packning

- Flytta `computeSawmillPacking()` och närliggande funktioner till `src/packing.js`.
- Behåll output-format exakt.

### Fas 4 – Sågplan och kerf

- Skapa ren `src/sawplan.js`.
- Flytta `buildSawmillCutPlan()` och `recalcSawmillPlanHeights()`.
- Ersätt `fix-v36.js` och `fix-v37.js` med riktig implementation.
- Centralt krav: varje planka skapas med differensen `tjocklek + kerf` mellan snitten.

### Fas 5 – Rendering

- Flytta canvasrendering.
- Rendering ska inte räkna egna snitthöjder.
- Rendering ska bara visa värden från sågplanen.

### Fas 6 – Städning

- Ta bort adapterfiler.
- Ta bort `fix-v36.js` och `fix-v37.js`.
- Byt versionsnummer från v35 till ny strukturell version, t.ex. v40.

## Nästa konkreta steg

Skapa:

```text
src/dimensions.js
src/dimensions-adapter.js
```

Flytta/adapterkoppla först dessa funktioner:

```text
dimensionLabel
effectiveAllowedWaneForDimension
requiredDiagonalWithWane
maxFreeWidthForThickness
resolveDimensionCandidate
effectiveCornerWane
findBestCenterBlock
```

Detta ger en tydlig modul utan att röra den känsliga sågplans-/kerf-logiken ännu.
