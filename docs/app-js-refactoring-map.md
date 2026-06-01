# app.js refactoring map

Syftet med detta dokument är att ge en aktuell karta över vad som fortfarande ligger i legacy `app.js`, vad som redan har brutits ut och vad som bör vänta.

## Nuvarande bootstrap-princip

`index.html` laddar `src/app.js`, som i sin tur laddar moduler i kontrollerad ordning.

Grundprincipen i refaktoreringen är:

1. Skapa modul.
2. Ladda modul utan adapter.
3. Verifiera att sidan fortfarande fungerar.
4. Ladda adapter.
5. Verifiera igen.
6. Först därefter överväga att rensa legacy-kopia.

Det här har visat sig viktigt eftersom vissa fixar (`fix-v36.js`, `fix-v37.js`) påverkar effektiv runtime-logik.

## Redan aktiva moduler

### Formattering

Aktiv modul:

- `src/format.js`
- `src/format-adapter.js`

Flyttade funktioner:

- `mmToIn()`
- `fmtMm()`
- `fmtIn()`

Risknivå: låg.

### Dimensionsetiketter

Aktiv modul:

- `src/dimension-label.js`
- `src/dimension-label-adapter.js`

Flyttad funktion:

- `dimensionLabel()`

Risknivå: låg.

### Vankants-/diagonalberäkning

Aktiv modul:

- `src/wane.js`
- `src/wane-adapter.js`

Flyttade funktioner:

- `effectiveAllowedWaneForDimension()`
- `effectiveCornerWane()`
- `requiredDiagonalWithWane()`
- `maxFreeWidthForThickness()`

Risknivå: medel, men hittills verifierad utan synliga problem.

### Partiell blockgeometri

Aktiv modul:

- `src/block-geometry.js`
- `src/block-geometry-adapter.js`

Flyttade funktioner:

- `completedSidesBeforeStep()`
- `planeForSide()`

Ej flyttade funktioner i samma område:

- `rotatedPointY()`
- `blockBottomAfterRotation()`
- `blockTopAfterRotation()`
- `blockMinYAfterRotation()`

Risknivå för aktiverad del: låg till medel.

Risknivå för ej aktiverad del: högre, eftersom de påverkar stöd, rotation och svärdsposition.

## Moduler som finns men inte bör aktiveras ännu

### Rotation

Finns:

- `src/rotation.js`

Innehåller:

- `sideForRotation()`
- `rotationToRadians()`
- `getRotationSequenceFromValues()`
- `getRotationSequenceFromDom()`

Rekommendation: aktivera inte ännu.

Orsak: `rotationToRadians()` ligger nära de kända problemen kring:

- rund sida mot stöd
- sågad sida mot stöd
- svärdets position
- stöd-/bäddreferens
- `fix-v36.js` / `fix-v37.js`

### Packningsrendering

Finns:

- `src/render-packing-canvas.js`
- `src/render-packing-adapter.js`

Status:

- modulen finns kvar
- adaptern ska inte laddas

Orsak: när adaptern testades kom tidigare felaktigt beteende tillbaka. Det tyder på att den utbrutna renderaren inte motsvarar effektiv runtime efter fix-filerna.

Se även:

- `docs/rendering-audit-plan.md`

### currentStepIndex bridge

Finns:

- `src/current-step-state-bridge.js`

Status:

- ska inte laddas

Orsak: den låste navigering mellan sågsteg när den testades. Legacy `currentStepIndex` ska tills vidare fortsätta vara ägare.

## Legacy app.js: funktionella områden

### 1. Grundläggande DOM/UI

Funktioner/ansvar:

- `$()`
- `setupTabs()`
- eventlyssnare
- flikhantering
- knapphantering
- inputuppdateringar

Rekommendation:

- bryt senare ut till `src/ui/` eller `src/ui-events.js`
- låg risk om man bara flyttar ren eventkoppling
- högre risk om `update()`-flödet ändras

### 2. State och runtime-cache

Legacy-variabler:

- `currentStepIndex`
- `latestPackingLayout`
- `latestSawmillCutPlan`
- `dimensions`

Status:

- `currentStepIndex` synkas till state men ägs fortfarande av legacy
- `latestPackingLayout` och `latestSawmillCutPlan` synkas till state efter `update()`
- `dimensions` har modulstöd men bör flyttas försiktigt

Rekommendation:

- rör inte `currentStepIndex` igen förrän större rendering/support-logik är stabil
- dimensions kan fortsätta flyttas stegvis

### 3. Indata och geometri

Delvis flyttat:

- inputläsning
- grundläggande geometri

Kvar att granska:

- `values()`
- `computeGeometry()`

Rekommendation:

- `values()` kan flyttas till en input-/settingsmodul
- `computeGeometry()` kan flyttas om implementationen är identisk och adapter görs försiktigt

Risknivå: låg till medel.

### 4. Dimensionerings-/optimeringslogik

Kvar i legacy:

- `resolveDimensionCandidate()`
- `findBestCenterBlock()`
- aktiv dimensionfiltrering beroende på optimeringsläge

Delvis beroenden redan flyttade:

- vankantsfunktioner i `src/wane.js`
- dimensionsetiketter i `src/dimension-label.js`

Rekommendation:

Nästa bra kandidat är att bryta ut:

- `resolveDimensionCandidate()`
- därefter `findBestCenterBlock()`

Förslag på modul:

- `src/dimension-resolver.js`
- `src/dimension-resolver-adapter.js`

Risknivå: medel.

Detta påverkar vilka dimensioner som väljs men inte rendering direkt.

### 5. Rotation och stöd

Kvar i legacy:

- `getRotationSequence()`
- `sideForRotation()`
- `rotationToRadians()`
- `retainedLogCutY()`
- `completedCutPlanes()`
- `pointInsideCompletedCuts()`
- `retainedShapeBottomAfterRotation()`
- `supportHeightsForStep()`
- `blockBottomAfterRotation()`
- `blockTopAfterRotation()`
- `downwardBlockFaceSide()`
- `shouldSupportOnBlockFace()`
- `supportBottomForStep()`

Rekommendation:

- vänta med detta tills rendering audit är gjord
- detta är kärnan i de kvarvarande visuella/stödrelaterade problemen

Risknivå: hög.

### 6. Sågplansgenerering

Kvar i legacy eller delvis flyttat:

- `buildSawList()`
- sawmill cut plan-logik
- packing layout-logik
- ordning på snitt
- relation mellan steg, rotation, stöd och svärdslinje

Rekommendation:

- gör inte större ändringar här innan stöd-/rotation-/renderinglogiken är dokumenterad
- kan brytas ut senare till `src/saw-plan-builder.js`

Risknivå: medel till hög.

### 7. Rendering

Kvar i legacy:

- timber canvas
- packing canvas runtime-rendering
- barkring
- bortsågade zoner
- stödlinjer
- svärdslinje
- tabellmarkeringar kopplade till canvas

Rekommendation:

- vänta
- följ `docs/rendering-audit-plan.md`
- utbruten renderer får inte aktiveras förrän den matchar effektiv runtime efter fixar

Risknivå: hög.

## Rekommenderad nästa arbetsordning

### Steg A: fortsätt med dimensioneringslogik

Nästa säkra större steg:

1. Skapa `src/dimension-resolver.js`.
2. Flytta `resolveDimensionCandidate()` dit.
3. Ladda modulen utan adapter.
4. Skapa adapter.
5. Aktivera adapter.
6. Testa att samma block och samma sågordning väljs.

Därefter:

1. Flytta `findBestCenterBlock()`.
2. Testa alla optimeringslägen:
   - blandat
   - timmer
   - plank
   - panel

### Steg B: städa input/geometri

Efter dimensioneringslogiken:

- flytta `values()`
- flytta eller verifiera `computeGeometry()`

### Steg C: rendering audit

När ren beräkningslogik är bättre avgränsad:

- jämför legacy-rendering med `fix-v36.js` och `fix-v37.js`
- uppdatera `src/render-packing-canvas.js` till effektiv runtime-logik
- först därefter aktivera renderer-adapter igen

## Viktig regel

Blanda inte funktionell korrigering och refaktorering i samma steg.

Om något ändrar beteende ska det kunna härledas till exakt en modul/adapternivå.
