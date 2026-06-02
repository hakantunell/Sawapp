# Refactor inventory: remaining legacy app.js areas

Status: after activation of the state-backed dimensions editor.

## Current refactoring policy

Only fix regressions caused by refactoring.

Known or suspected pre-existing calculation bugs are documented separately in `docs/known-bugs.md` and should not be fixed during structural refactoring unless a later comparison proves that the refactor introduced them.

## Areas already extracted or routed through modules

### Formatting / labels / wane

- `src/format.js`
- `src/dimension-label.js`
- `src/wane.js`

### Geometry / dimensions / state

- `src/state.js`
- `src/state-adapter.js`
- `src/inputs.js`
- `src/geometry.js`
- `src/dimensions.js`
- `src/dimensions-editor.js`
- `src/dimensions-editor-adapter.js`
- `src/dimensions-editor-activation-adapter.js`

### Dimension resolving and packing helpers

- `src/dimension-resolver.js`
- `src/packing-dimensions.js`
- adapters for resolver and packing helpers

### Saw plan / rendering

- `src/sawplan.js`
- `src/render-common.js`
- `src/render-packing-canvas.js`
- `src/render-sawmill-cut-plan.js`
- `src/render-yield-results.js`
- `src/render-calc-details.js`
- `src/render-metrics.js`
- `src/render-big-screen-step.js`
- `src/render-saw-order-status.js`
- `src/render-timber-saw-list.js`
- `src/render-timber-canvas.js` wrapper
- `src/update-render-extract-adapter.js`

## Remaining major legacy areas

### 1. Legacy `update()` orchestration

`update()` still exists in `app.js` and still orchestrates the full calculation/render pass.

Current adapter strategy:

- legacy `update()` runs first
- extracted renderers re-render specific UI areas afterward

This is acceptable as an intermediate state, but it means some work is duplicated.

Recommended next step:

- create a pure `computeViewModel()` module that calculates:
  - values
  - geometry
  - selected center block
  - saw list
  - side yield
  - packing layout
  - sawmill cut plan
  - active step
  - metrics
- have adapters consume that view model instead of recomputing locally.

This should be done before trying to replace `update()` itself.

### 2. Legacy `buildSawList()`

Still in `app.js`.

Likely a good next extraction target because:

- it is calculation logic, not DOM logic
- it feeds both timber saw list and timber canvas
- it is probably less risky than fully replacing `update()`

Recommended approach:

1. Extract as passive module, for example `src/timber-saw-list.js`.
2. Keep the legacy implementation active initially.
3. Add an adapter only after comparing output shape carefully.

Do not change support-height formulas during extraction.

### 3. Legacy `renderTimberCanvas()`

Currently only routed through `renderTimberCanvasFromModule()`, which calls the legacy function.

This function has historically contained subtle visual fixes, so it should not be copied blindly.

Recommended approach:

- split into helper functions only after `buildSawList()` is stable
- preserve current rendering behavior exactly
- do not fix old visual bugs in this step

### 4. Sawmill/packing algorithm

Parts are extracted, but the legacy algorithm still has known suspicious behavior when only a fixed center block is active in sawmill mode.

This is documented in `docs/known-bugs.md`.

Do not address this during structural refactoring.

### 5. Legacy event setup and tab/navigation handling

Still largely in `app.js`.

Recommended to defer until calculation/rendering is cleaner.

## Recommended next refactoring step

Extract `buildSawList()` as a passive module.

Reason:

- It is one of the last substantial non-DOM functions in `app.js`.
- It is a cleaner target than `renderTimberCanvas()`.
- It helps move timber mode from legacy orchestration toward module-based calculation.

Proposed file:

```text
src/timber-saw-list.js
```

Proposed API:

```javascript
SawTimberSawList.buildSawList(block, geom, values)
```

Activation should happen in a later commit via an adapter, after verifying that the module preserves the legacy output structure.

## Stop condition

Do not attempt to replace `update()` directly until:

- `buildSawList()` is extracted
- the view model calculation is centralized
- extracted renderers no longer need to recompute the same model independently
