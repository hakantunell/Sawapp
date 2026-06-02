# Canvas ownership

Status: after `renderSawOrderStatus()` was moved to `#sawOrder` and step buttons were routed through saw-list row selection.

## Summary

There are still two different ownership models for canvas rendering.

## Timber/blocking canvas

File:

```text
src/render-timber-canvas.js
```

Current status:

```text
renderTimberCanvasFromModel(model)
  ↓
renderTimberCanvasFromModule(block, geom, values, sawList)
  ↓
legacy renderTimberCanvas(...)
```

The module is only a wrapper.

It does not own the actual drawing implementation yet.

Reason:

- Legacy `renderTimberCanvas()` contains subtle visual fixes.
- Earlier regressions showed that canvas positioning and blade rendering are sensitive.
- Copying or rewriting this function blindly risks reintroducing old render bugs.

Conclusion:

> Timber canvas is still legacy-owned, but it has a modular entry point.

## Sawmill/packing canvas

File:

```text
src/render-packing-canvas.js
```

Current status:

- This module installs itself over the global `renderPackingCanvas` when legacy has already defined it.
- It therefore owns the active sawmill/packing canvas drawing path.

Important detail:

The renderer still uses current-step information in a mixed way:

- Some state now comes from `SawState` / `ViewModel`.
- Some legacy code and helpers still depend on the old `currentStepIndex` behavior.

The bug with the `Föregående snitt` / `Nästa snitt` buttons proved this:

- Direct state mutation updated text values.
- It did not reliably redraw the canvas.
- Clicking a saw-list row did redraw the canvas correctly.

Current workaround:

- `renderSawOrderStatus()` routes the buttons through saw-list row clicks.
- This reuses the same proven legacy path that updates both index and canvas.

Conclusion:

> Sawmill canvas is module-owned, but step navigation is still coupled to the legacy saw-list row click path.

## Remaining hidden coupling

The following are still coupled:

```text
saw-list row click
  ↓
legacy currentStepIndex
  ↓
canvas rendering
```

This is why row clicks must currently be treated as the authoritative navigation path.

## Recommended next step

Do not rewrite timber canvas yet.

The next safe step is to remove the current-step coupling from sawmill/packing canvas by making the packing canvas renderer accept the selected step index from `ViewModel` directly.

Proposed change:

```javascript
renderPackingCanvas(block, geom, v, packingLayout, sawmillCutPlan, stepIndex)
```

Then inside `render-packing-canvas.js`, replace internal reads of legacy/current global step index with the passed `stepIndex`.

After that, `renderSawOrderStatus()` can navigate through `SawState` again without relying on row-click simulation.

## Not recommended yet

Do not copy or replace legacy `renderTimberCanvas()` yet.

That should wait until:

1. packing canvas is fully state-indexed,
2. step navigation no longer depends on row clicks,
3. the view model is the only source for current step selection.

## Policy

Keep current behavior stable.

Only change canvas code when the change removes a known hidden coupling and can be tested immediately through visible UI behavior.
