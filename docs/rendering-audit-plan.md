# Rendering audit före fortsatt renderingsrefaktorering

## Bakgrund

Vid inkoppling av den utbrutna `src/render-packing-canvas.js` via `src/render-packing-adapter.js` kom ett tidigare beteende tillbaka. Det tyder på att den utbrutna renderaren inte motsvarar den effektiva runtime-versionen efter `fix-v36.js` och `fix-v37.js`.

Därför är adaptern bortkopplad tills vidare. `src/render-packing-canvas.js` finns kvar som arbetskopia, men produktionen använder fortsatt legacy-renderingen.

## Aktuell policy

Tills renderingens effektiva beteende är kartlagt ska vi inte flytta följande funktioner:

- `renderPackingCanvas()`
- `renderTimberCanvas()`
- funktioner som direkt påverkar svärdets position
- funktioner som direkt påverkar stöd-/bäddreferens
- funktioner som direkt påverkar tidigare bortsågade zoner

## Saker som måste jämföras

### 1. Effektiv runtime-rendering

Kartlägg vilken version av renderingen som faktiskt körs efter laddningsordningen:

1. `app.js`
2. `fix-v36.js`
3. `fix-v37.js`

Målet är att identifiera om fixfilerna:

- ersätter hela renderaren
- patchar hjälpfunktioner
- ändrar data som renderaren använder
- lägger till ny logik runt stöd, kerf eller rotation

### 2. Stödreferens

Kontrollera särskilt skillnaden mellan:

- stock på rund/osågad sida
- stock på tidigare sågad plan yta
- rotation 0°
- rotation 90°
- rotation 180°
- rotation 270°

Tidigare observerat problem: när stocken ligger på sågad sida respektive osågad sida hamnar stöd-/bäddnivån olika.

### 3. Svärdets position

Kontrollera:

- om svärdet mäts från underkant svärd eller från snittlinje
- om kerf ingår i varje snitt
- om första snittet ligger ovanför plankan
- om efterföljande snitt räknar bort tidigare kerf korrekt

### 4. Kerf

Grundprincip som ska gälla:

> Varje snitt tar bort kerf. Det får inte finnas specialberäkningar för enstaka steg som bara råkar fungera för vissa sågordningar.

Det måste fungera oavsett:

- antal sidobitar
- plankplacering
- rotation
- om aktuell referens är rund sida eller sågad sida

### 5. Tidigare bortsågade zoner

Kontrollera att tidigare bortsågade slabbor/ytterzoner påverkar:

- visuell kropp i canvas
- stöd-/bäddnivå
- svärdslinje
- kvarvarande material

## Rekommenderad arbetsordning senare

När övrig refaktorering är klar:

1. Läs `fix-v36.js` och `fix-v37.js` rad för rad.
2. Dokumentera exakt vilka funktioner de patchar.
3. Flytta först hjälpfunktionerna till riktiga moduler.
4. Skriv om `src/render-packing-canvas.js` så den matchar effektiv runtime-logik.
5. Koppla in adapter igen.
6. Visuell regressionstest med flera rotationssteg.
7. Först därefter ta bort legacy-rendering.

## Fortsatt refaktorering under tiden

Säkrare områden att fortsätta med:

- state-hjälpare
- input-/settings-moduler
- dimensions-datahantering
- ren beräkningslogik som inte påverkar canvas direkt
- dokumentation av laddningsordning och beroenden

Undvik tills vidare:

- renderers
- `currentStepIndex` som primär state-källa
- stöd-/svärdsberäkningar
- kerf-fixar
