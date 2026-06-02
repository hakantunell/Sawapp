# Legacy `update()` inventory

Status: after sawmill packing canvas and sawmill cut-plan table were moved to explicit `ViewModel.stepIndex`.

## Current execution model

The active runtime still executes:

```text
legacy update()
  ↓
buildSawViewModel()
  ↓
extracted renderers
```

This means legacy `update()` still runs first and may still mutate DOM and legacy variables, but most visible UI regions are then overwritten by module renderers.

## Line-by-line responsibility inventory

The current legacy `update()` body does the following.

### 1. Manual rotation visibility

Legacy:

```javascript
$("manualRotationWrap").classList.toggle("hidden", $("rotationPreset").value !== "manual");
```

Status: replaced.

Replacement:

```text
src/render-input-visibility.js
```

Called from:

```text
src/update-render-extract-adapter.js
```

### 2. Dimensions editor rendering

Legacy:

```javascript
renderDimensions();
```

Status: replaced / routed.

Replacement:

```text
src/dimensions-editor.js
src/dimensions-editor-adapter.js
src/dimensions-editor-activation-adapter.js
```

`renderDimensions()` is now routed to the state-backed dimensions editor.

### 3. Core calculation

Legacy:

```javascript
const v = values();
const geom = computeGeometry(v);
const block = findBestCenterBlock(geom, v);
const sawList = buildSawList(block, geom, v);
const sideYield = computeSideYield(block, geom, v);
const packingLayout = ... computeSawmillPacking(...);
const sawmillCutPlan = ... buildSawmillCutPlan(...);
```

Status: duplicated but still necessary while legacy `update()` remains first-pass.

Replacement exists:

```text
src/view-model.js
```

The same work is now centralized in:

```javascript
SawViewModel.buildViewModel()
```

But legacy `update()` still performs the calculations before the adapter runs. This is duplicated work.

Recommended next action:

Do not remove this until a module-owned update path exists.

### 4. Legacy current step reset

Legacy:

```javascript
const activePlanLength = sawmillCutPlan ? sawmillCutPlan.length : sawList.length;
if (currentStepIndex >= activePlanLength) currentStepIndex = 0;
```

Status: partly replaced.

Replacement exists in:

```text
src/view-model.js
```

`buildViewModel()` clamps `SawState.currentStepIndex` to the active plan length.

Legacy `currentStepIndex` may still affect legacy first-pass rendering, but extracted sawmill renderers now use `ViewModel.stepIndex`.

Recommended next action:

Keep until legacy `update()` no longer renders first-pass canvas/status/table.

### 5. Metrics calculation and rendering

Legacy:

```javascript
sideArea
sawnArea
logArea
yieldPct
$("designDiameter").textContent = ...
$("usableDiameter").textContent = ...
$("yieldPct").textContent = ...
$("sawnArea").textContent = ...
$("logVolume").textContent = ...
```

Status: replaced.

Replacement:

```text
src/render-metrics.js
src/view-model.js
```

Called from:

```text
src/update-render-extract-adapter.js
```

Legacy still writes these values first, but module renderer overwrites them.

### 6. Saw order status card and previous/next buttons

Legacy:

```javascript
const order = $("sawOrder");
order.innerHTML = ...
$("prevStep").onclick = ...
$("nextStep").onclick = ...
```

Status: replaced.

Replacement:

```text
src/render-saw-order-status.js
```

Current behavior:

- Writes to `#sawOrder`.
- Renders previous/next buttons.
- Navigates through `SawState`.
- Calls `update()`.

This is now state-driven and no longer relies on saw-list row click simulation.

### 7. Support side view

Legacy:

```javascript
renderSupportSideView(displayStepForSupport, geom);
```

Status: replaced.

Replacement:

```text
src/render-support-side-view.js
```

Called from adapter with full `ViewModel`.

### 8. Calculation details table

Legacy:

```javascript
$("calcDetails").innerHTML = ...
```

Status: replaced.

Replacement:

```text
src/render-calc-details.js
```

Called from adapter.

### 9. Latest plan globals

Legacy:

```javascript
latestPackingLayout = packingLayout;
latestSawmillCutPlan = sawmillCutPlan;
```

Status: partly replaced.

Replacement:

```text
src/view-model.js
src/latest-plan-sync.js
```

`buildViewModel()` updates `SawState` and attempts to keep latest plan globals in sync.

Legacy globals may still be used by legacy `renderCanvas()` during the first pass.

Recommended next action:

Keep until `renderCanvas()` is no longer called from legacy update.

### 10. Yield result rendering

Legacy:

```javascript
if (packingLayout) renderPackingResult(packingLayout); else renderSideYield(sideYield);
```

Status: replaced.

Replacement:

```text
src/render-yield-results.js
```

Called from adapter.

### 11. Canvas rendering

Legacy:

```javascript
renderCanvas(block, geom, v, sawList);
```

Status: mixed.

#### Sawmill/packing canvas

Mostly replaced.

Replacement:

```text
src/render-packing-canvas.js
```

Current state:

- Uses explicit `stepIndex` from `ViewModel`.
- No longer depends on legacy row-click navigation.
- Still falls back to `SawState` / legacy index if explicit index is omitted.

#### Timber/blocking canvas

Still legacy-owned.

Current wrapper:

```text
src/render-timber-canvas.js
```

But the wrapper calls legacy `renderTimberCanvas(...)`.

Recommended next action:

Do not rewrite yet unless there is a precise reason. This area has previously caused visual regressions.

### 12. Saw plan / saw list table rendering

Legacy:

```javascript
if (!renderSawmillCutPlan(sawmillCutPlan)) renderSawList(sawList);
```

Status: partly replaced.

#### Sawmill cut-plan table

Replaced.

Replacement:

```text
src/render-sawmill-cut-plan.js
```

Current state:

- Accepts explicit `stepIndex`.
- Row clicks set `SawState` only.

#### Timber saw-list table

Replaced.

Replacement:

```text
src/render-timber-saw-list.js
```

Called from adapter.

### 13. Big step display

Legacy:

```javascript
$("bigStep").textContent = ...
$("bigHeight").textContent = ...
$("bigRotation").textContent = ...
$("bigReference").textContent = ...
```

Status: replaced.

Replacement:

```text
src/render-big-screen-step.js
```

Called from adapter.

## Summary table

| Responsibility | Legacy still runs? | Module replacement active? | Safe to remove from legacy now? |
|---|---:|---:|---:|
| manual rotation visibility | Yes | Yes | Later |
| dimensions rendering | Yes via routed function | Yes | Later |
| values/geometry/block/list calculations | Yes | Yes, duplicated | No |
| current step clamping | Yes | Yes, SawState | Not yet |
| metrics rendering | Yes | Yes | Later |
| saw order card/buttons | Yes | Yes | Later |
| support side view | Yes | Yes | Later |
| calc details | Yes | Yes | Later |
| latest plan globals | Yes | Partial | Not yet |
| yield result rendering | Yes | Yes | Later |
| packing canvas | Yes first pass | Yes second pass | Later |
| timber canvas | Yes | Wrapper only | No |
| sawmill table | Yes first pass | Yes second pass | Later |
| timber saw list | Yes first pass | Yes second pass | Later |
| big step display | Yes | Yes | Later |

## Main conclusion

Most visible rendering is now module-owned after the adapter pass.

The two major blockers before replacing legacy `update()` are:

1. `renderTimberCanvas()` is still legacy-owned.
2. `legacy update()` still performs the first-pass calculation/rendering before `ViewModel` and extracted renderers run.

## Recommended next refactoring direction

Do not remove code directly from legacy `update()` yet.

The safer next step is to introduce a module-owned update orchestrator in passive mode:

```text
src/update-orchestrator.js
```

Potential API:

```javascript
SawUpdateOrchestrator.updateFromViewModel()
```

It should:

1. call `buildSawViewModel()`
2. call all extracted renderers in the same order as `update-render-extract-adapter.js`
3. not call legacy `update()`
4. remain passive until explicitly activated

This would let us compare:

```text
legacy update + adapter
```

against:

```text
pure ViewModel update orchestrator
```

without deleting legacy code first.

## Do not do yet

Do not rewrite or delete `renderTimberCanvas()` yet.

Do not remove the calculation section from legacy `update()` until the module-owned orchestrator can render all required UI regions independently.
