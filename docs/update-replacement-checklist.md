# Update replacement checklist

Status: after central `ViewModel` and extracted renderers are active.

## Current flow

The application still keeps legacy `update()` from `app.js` as the first pass.

The active wrapper flow is:

```text
legacy update()
  ↓
buildSawViewModel()
  ↓
extracted renderers
```

This is safe but duplicates some calculation and rendering work.

## Extracted renderer responsibilities already active

- input visibility
- metrics
- calculation details
- big-screen current step
- saw-order status
- support side view
- timber saw list
- timber canvas wrapper
- dimensions editor

## Extracted calculation/state responsibilities already active

- values/input access helpers
- geometry
- dimension resolving
- center-block resolving through adapter
- packing-dimensions helpers
- timber saw list builder
- central view model
- SawState for current step, latest plans, dimensions

## What legacy `update()` likely still does uniquely

Before replacing or shrinking `update()`, verify whether it still uniquely handles:

1. Packing canvas rendering
2. Sawmill cut-plan table rendering
3. Side-yield / packing yield result rendering
4. Error/empty-state messages
5. Tab/section visibility
6. Any direct canvas drawing that is not re-rendered afterward
7. Any `latestPackingLayout` / `latestSawmillCutPlan` assignment not covered by `SawViewModel`
8. Any reset of current step index when plan length changes

## Next safe strategy

Do not replace `update()` in one step.

Instead:

1. Add each remaining legacy-render responsibility to `update-render-extract-adapter` using `ViewModel`.
2. Verify behavior.
3. Once all visible output is covered by extracted renderers, introduce a feature flag / adapter switch for a module-owned update pass.
4. Only then consider bypassing legacy `update()`.

## Candidate next extraction

The next best target is probably one of these existing modules:

- `render-packing-canvas.js`
- `render-sawmill-cut-plan.js`
- `render-yield-results.js`

These already exist, but the active update adapter does not yet call all of them directly from `ViewModel`.

Recommended next step:

> Inspect these render modules and wire any missing ones into `update-render-extract-adapter`, still after legacy `update()`.

This keeps behavior safe while making the post-update renderer chain more complete.

## Stop condition before replacing legacy update

Do not bypass legacy `update()` until all main UI regions are known to be rendered by extracted modules from `ViewModel`.
