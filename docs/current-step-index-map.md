# Kartläggning: `currentStepIndex`

Syfte: identifiera alla kända beroenden innan `currentStepIndex` flyttas från legacy `app.js` till `SawState`.

## Nuvarande definition

I legacy `app.js` ligger variabeln globalt i filens topp:

```js
let currentStepIndex = 0;
```

Den används som valt/aktivt steg i både vanlig blocksågning och sågverk/packning.

## Identifierade användningsområden

### 1. Canvas-rendering för vanlig timmersågning

Funktion: `renderTimberCanvas(block, geom, v, sawList)`

Användning:

```js
const step = sawList[currentStepIndex] || sawList[0];
const planes = completedCutPlanes(block, sawList, currentStepIndex);

if (shouldSupportOnBlockFace(block, sawList, currentStepIndex, step ? step.rotationValue : 0)) {
  ...
}
```

Roll:

- Väljer vilket steg som ska visas.
- Avgör vilka tidigare snitt som redan är gjorda.
- Påverkar om stocken ligger på rund sida eller sågad blockyta.

Risk vid flytt: hög. Rendering och geometri måste läsa samma stegindex.

---

### 2. Canvas-rendering för sågverk/packning

Funktion: `renderPackingCanvas(...)`

Användning:

```js
const planStep = sawmillCutPlan && sawmillCutPlan[currentStepIndex]
  ? sawmillCutPlan[currentStepIndex]
  : sawmillCutPlan?.[0];

const slabCuts = completedSlabCuts(sawmillCutPlan, currentStepIndex);
const supportBottom = remainingPackingBoundsWithSlabCuts(
  packingLayout,
  sawmillCutPlan,
  currentStepIndex,
  planStep ? planStep.rotationValue : 0
);
```

Roll:

- Väljer aktuellt sågverkssteg.
- Avgör vilka slabbor/sidobitar som redan är borttagna.
- Påverkar svärdets visuella position.

Risk vid flytt: hög. Detta är en av de känsligaste delarna eftersom tidigare buggar har funnits här.

---

### 3. Såglista-tabellen

Funktion: `renderSawList(sawList)`

Användning:

```js
tr.className = (s.step - 1) === currentStepIndex ? "selected-step" : "";
tr.onclick = () => { currentStepIndex = s.step - 1; update(); };
```

Roll:

- Markerar vald rad i såglistan.
- Gör att klick på rad byter aktuellt steg.

Risk vid flytt: medel. Enkel att adapterkoppla via getter/setter.

---

### 4. Huvudloopen `update()`

Funktion: `update()`

Användning:

```js
const activePlanLength = sawmillCutPlan ? sawmillCutPlan.length : sawList.length;
if (currentStepIndex >= activePlanLength) currentStepIndex = 0;

const step = sawmillCutPlan ? sawmillCutPlan[currentStepIndex] : sawList[currentStepIndex];

const displayStepForSupport = displayPlanForSupport[currentStepIndex] || displayPlanForSupport[0];

const displayPlan = sawmillCutPlan || sawList;
if (displayPlan[currentStepIndex]) {
  const step = displayPlan[currentStepIndex];
  ...
}
```

Roll:

- Säkerställer att index inte går utanför aktuell plan.
- Väljer steg till statusrutan.
- Väljer steg till stödvyn.
- Väljer steg till storskärmsvyn.

Risk vid flytt: medel/hög. Här bör vi skapa små hjälpfunktioner för att minska upprepning.

---

### 5. Nästa/föregående-knappar i statusrutan

Funktion: inuti `update()` efter att statusrutan renderats.

Användning:

```js
$("prevStep").onclick = () => {
  currentStepIndex = (currentStepIndex - 1 + activePlanLength) % activePlanLength;
  update();
};

$("nextStep").onclick = () => {
  currentStepIndex = (currentStepIndex + 1) % activePlanLength;
  update();
};
```

Roll:

- Ändrar aktivt steg i aktuell plan.

Risk vid flytt: låg/medel.

---

### 6. Input/change-reset

Kodområde: eventlyssnare för stockmått, såginställningar och optimeringsläge.

Användning:

```js
$(id).addEventListener("input", () => { currentStepIndex = 0; update(); });
$(id).addEventListener("change", () => { currentStepIndex = 0; update(); });
```

Roll:

- Nollställer aktivt steg när indata ändras.

Risk vid flytt: låg.

---

### 7. Preset-knappen

Kodområde: `presetTimber`.

Användning:

```js
currentStepIndex = 0;
update();
```

Roll:

- Nollställer aktivt steg när dimensionspreset återställs.

Risk vid flytt: låg.

---

### 8. Storskärmens föregående/nästa

Kodområde: `bigPrevStep` och `bigNextStep`.

Användning:

```js
currentStepIndex = (currentStepIndex - 1 + activePlanLength) % activePlanLength;
currentStepIndex = (currentStepIndex + 1) % activePlanLength;
```

Observation:

Här används `activePlanLength`, men den är definierad lokalt i `update()` och finns inte i detta scope. Det kan därför redan finnas en latent bugg i storskärmsknapparna. Den bör rättas samtidigt eller strax efter state-flytten.

Risk vid flytt: medel. Här bör vi inte bara ersätta variabeln, utan också räkna fram planlängd säkert.

---

## Föreslagen migreringsstrategi

### Steg A – Lägg hjälpfunktioner i `SawState`

Lägg till:

```js
getCurrentStepIndex()
setCurrentStepIndex(index)
resetCurrentStepIndex()
moveCurrentStep(delta, planLength)
ensureCurrentStepInRange(planLength)
```

### Steg B – Skapa adapter

Skapa:

```text
src/state-adapter.js
```

Syfte:

- Exponera små globala helper-funktioner om nödvändigt.
- Undvika att behöva ändra alla `currentStepIndex`-referenser i en stor commit.

### Steg C – Ersätt i denna ordning

1. Reset vid input/change.
2. Reset vid preset.
3. Radklick i såglistan.
4. Prev/next i statusrutan.
5. Val av steg i `update()`.
6. Canvas-rendering sist.

### Steg D – Storskärmsknappar

Rätta samtidigt den latenta `activePlanLength`-buggen genom att skapa en funktion som räknar fram aktiv planlängd från aktuell plan.

## Rekommenderad nästa commit

Börja med en liten och isolerad ändring i `state.js`:

```js
function resetCurrentStepIndex() {
  return setCurrentStepIndex(0);
}

function moveCurrentStep(delta, planLength) {
  const length = Math.max(1, Number(planLength) || 1);
  state.currentStepIndex = (state.currentStepIndex + delta + length) % length;
  return state.currentStepIndex;
}

function ensureCurrentStepInRange(planLength) {
  const length = Math.max(0, Number(planLength) || 0);
  if (length <= 0 || state.currentStepIndex >= length) {
    state.currentStepIndex = 0;
  }
  return state.currentStepIndex;
}
```

Den committen ändrar fortfarande inte legacy `app.js`, men gör `SawState` redo för faktisk migrering.
