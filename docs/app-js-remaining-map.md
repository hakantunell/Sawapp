# Remaining map for legacy app.js

Det här dokumentet kartlägger de större kluster som fortfarande finns kvar i legacy `app.js` efter den stegvisa refaktoreringen.

Syftet är att undvika att nästa refaktoreringssteg väljs på känsla. Vi vill flytta nästa stora block på ett kontrollerat sätt och undvika de delar som redan har visat sig vara känsliga.

## Kort nuläge

Följande ansvar är redan helt eller delvis flyttade till moduler och aktiva via adapters:

- formattering
- dimensionsetiketter
- inläsning av formulärvärden (`values()`)
- grundläggande loggeometri (`computeGeometry()`)
- vankants-/diagonalberäkning
- dimensionsresolver (`resolveDimensionCandidate()`)
- centrumblocksval (`findBestCenterBlock()`)
- vissa enkla blockgeometrifunktioner

Legacy `app.js` innehåller fortfarande gamla kopior av flera av dessa funktioner. De används inte alltid längre, men de ligger kvar som fallback medan refaktoreringen pågår.

## Större kvarvarande kluster

### 1. UI och state

Exempelansvar:

- `$()`
- `setupTabs()`
- `currentStepIndex`
- `latestPackingLayout`
- `latestSawmillCutPlan`
- `dimensions`
- eventbindningar i `renderDimensions()`
- delar av `update()`

Risknivå: medel.

Kommentar:

UI-koden är inte matematiskt svår, men den är starkt kopplad till `update()` och `currentStepIndex`. Tidigare försök att låta en ny state-bridge äga `currentStepIndex` orsakade navigeringsproblem. Därför bör `currentStepIndex` fortsatt ägas av legacy tills vidare.

Möjliga senare moduler:

- `src/ui-tabs.js`
- `src/dimensions-ui.js`
- `src/update-controller.js`

Rekommendation:

Vänta med större UI-flytt tills sågplans-/packningslogiken är bättre avgränsad.

---

### 2. Rotation, stöd och kvarvarande kropp

Exempelfunktioner:

- `getRotationSequence()`
- `sideForRotation()`
- `rotationToRadians()`
- `retainedLogCutY()`
- `completedCutPlanes()`
- `pointInsideCompletedCuts()`
- `retainedShapeBottomAfterRotation()`
- `supportHeightsForStep()`
- `blockMinYAfterRotation()`
- `blockBottomAfterRotation()`
- `blockTopAfterRotation()`
- `downwardBlockFaceSide()`
- `shouldSupportOnBlockFace()`
- `supportBottomForStep()`

Risknivå: hög.

Kommentar:

Det här är den mest känsliga delen av applikationen. Den påverkar:

- om stocken ligger på rund/osågad sida eller sågad plan sida
- hur bädd-/stödnivå räknas
- var svärdslinjen hamnar
- hur tidigare bortsågade zoner påverkar kroppen
- de fel som fixades eller delvis fixades i `fix-v36.js` och `fix-v37.js`

Rekommendation:

Flytta inte detta nu. Gör först en separat audit enligt `docs/rendering-audit-plan.md`.

---

### 3. Timmer-/centrumblocksåglista

Exempelfunktion:

- `buildSawList()`

Beroenden:

- rotation
- blockgeometri
- supportlogik
- `supportHeightsForStep()`
- `completedCutPlanes()`
- `retainedShapeBottomAfterRotation()`

Risknivå: hög.

Kommentar:

`buildSawList()` ser vid första anblick ut som en bra kandidat, men den är tätt kopplad till stödlogiken. Eftersom stödlogiken fortfarande är känslig bör `buildSawList()` inte flyttas före stöd-/rotationsaudit.

Rekommendation:

Vänta.

---

### 4. Sidoutbyte och packningsdimensioner

Exempelfunktioner:

- `activeSideYieldDimensions()`
- `activePackingDimensions()`
- `circleWidthAtY()`
- `dimensionToPackCandidate()`
- `rectFitsCircle()`

Risknivå: låg till medel.

Kommentar:

Det här klustret är mer isolerat än stöd-/renderingslogiken. Funktionerna handlar främst om vilka dimensionsrader som får vara med i packnings-/sidobitsberäkningar och om en rektangel får plats i stockcirkeln.

Möjlig modul:

- `src/packing-dimensions.js`
- `src/packing-dimensions-adapter.js`

Rekommendation:

Detta är bästa nästa kandidat.

Varför:

- påverkar faktisk packningslogik
- ligger före rendering
- är inte direkt beroende av `currentStepIndex`
- är inte direkt beroende av stöd-/svärdsposition
- kan testas genom att kontrollera att samma packningslayout/sågordning skapas

---

### 5. Packningsalgoritm och sågverksplan

Exempelfunktioner:

- `computeSawmillPacking()`
- `buildSawmillCutPlan()`
- `recalcSawmillPlanHeights()`
- `sawmillRotationForSide()`
- hjälpfunktioner runt sidobitar, slabbor och centrumblock

Risknivå: medel till hög.

Kommentar:

Detta är ett stort område med hög funktionell påverkan. Själva packningsalgoritmen och sågverksplanen är mindre känsliga än rendering, men de påverkar vilka steg som visas och hur många steg som skapas.

Rekommendation:

Flytta efter att `packing-dimensions` är separerad.

Möjlig senare modul:

- `src/sawmill-packing.js`
- `src/sawmill-cut-plan.js`

---

### 6. Rendering: timmerläge

Exempelfunktioner:

- `drawBarkRing()`
- `drawCutLogShape()`
- `applyCompletedCutClip()`
- `drawCompletedCutLines()`
- `drawRetainedLogAtCurrentRotation()`
- `renderTimberCanvas()`

Risknivå: hög.

Kommentar:

Denna del är känslig eftersom renderingen använder samma begrepp som stöd- och rotationslogiken: bädd, kvarvarande kropp, rotation och färdiga snittytor.

Rekommendation:

Vänta tills stöd-/rotationsaudit är gjord.

---

### 7. Rendering: packnings-/sågverksläge

Exempelfunktioner:

- `completedSlabCuts()`
- `pointKeptBySlabCuts()`
- `drawRemovedSlabs()`
- `remainingPackingBoundsWithSlabCuts()`
- `renderPackingCanvas()`

Risknivå: hög.

Kommentar:

Detta är redan försökt utbrutet till `src/render-packing-canvas.js`, men adaptern återinförde gammalt felaktigt beteende. Därför ska den inte aktiveras igen förrän effektiv runtime-logik efter `fix-v36.js` och `fix-v37.js` är jämförd.

Rekommendation:

Vänta.

---

### 8. Renderade tabeller och sammanställning

Exempelfunktioner:

- `renderSawmillCutPlan()`
- `renderSawList()`
- `renderSupportSideView()`
- statusdelen i `update()`

Risknivå: medel.

Kommentar:

Dessa funktioner är UI-tunga men inte lika matematiskt riskabla som canvas. De är dock kopplade till `currentStepIndex`, planlängd och aktiv plan.

Rekommendation:

Kan flyttas senare när planbyggarna är separerade.

---

## Rekommenderad nästa modul

Nästa modul bör vara:

```text
src/packing-dimensions.js
src/packing-dimensions-adapter.js
```

Första funktioner att flytta:

```js
activePackingDimensions()
circleWidthAtY()
dimensionToPackCandidate()
rectFitsCircle()
```

Eventuellt även senare:

```js
activeSideYieldDimensions()
```

## Varför inte buildSawList nu?

`buildSawList()` är lockande eftersom den är central, men den är beroende av den känsliga stöd-/rotationskedjan.

Att flytta den nu skulle blanda tre saker:

1. sågplansbyggande
2. stödberäkning
3. tidigare kända rotations-/stödfel

Det blir svårare att avgöra om ett eventuellt fel kommer från refaktoreringen eller från den underliggande logiken.

## Nästa konkreta steg

1. Skapa `src/packing-dimensions.js`.
2. Flytta de rena packningshjälparna dit.
3. Ladda modulen utan adapter.
4. Skapa adapter.
5. Aktivera adapter.
6. Testa att packningsläge/sågverksläge fortfarande skapar samma logiska layout.

## Saker att inte röra ännu

- `rotationToRadians()`
- `supportHeightsForStep()`
- `retainedShapeBottomAfterRotation()`
- `renderTimberCanvas()`
- `renderPackingCanvas()`
- `currentStepIndex` som primär state-källa
