# Update mode feature flag

Sawapp currently supports two update modes.

## ViewModel mode

Default mode.

Runtime flow:

```text
ViewModel
  ↓
extracted renderers
```

This mode bypasses legacy `update()` and runs:

```javascript
SawUpdateOrchestrator.updateFromViewModel()
```

The legacy update path is still kept as a fallback while the migration is ongoing.

## Legacy fallback mode

Runtime flow:

```text
legacy update()
  ↓
update-render-extract-adapter
  ↓
SawUpdateOrchestrator.updateFromViewModel()
```

The adapter intentionally reuses the same orchestrator as ViewModel mode so the modular render sequence only exists in one place.

## Activation and fallback

ViewModel mode is enabled by default.

Disable ViewModel mode from the browser console:

```javascript
disableViewModelUpdateFeatureFlag()
```

Enable it again:

```javascript
enableViewModelUpdateFeatureFlag()
```

Force ViewModel mode through the URL:

```text
?viewModelUpdate=1
```

Force legacy fallback through the URL:

```text
?viewModelUpdate=0
```

Persistent fallback state is stored in localStorage:

```text
sawapp.viewModelUpdate.disabled
```

## Status after testing

The ViewModel mode has been manually tested with:

- sawmill/packing optimization
- timber/block optimization
- dimensions
- priority move up/down in the dimensions editor
- large-screen step view
- rotation changes
- step navigation
- packing layout and side yield rendering

Known migration issues found and fixed:

- Timber canvas did not update outside sawmill/packing mode because legacy `renderTimberCanvas()` still read `currentStepIndex` and `latestPackingLayout`.
- Sawmill packing could use stale dimensions because `SawState` and legacy `dimensions` diverged.
- The dimensions editor priority buttons could appear stuck because the visible list and `SawState` were correct, while legacy `dimensions` still had an older order. `SawUpdateOrchestrator` now forces the dimensions editor to render from `SawState` in ViewModel mode.

## Remaining legacy dependencies

These are intentionally still present during the migration:

- `app.js` still contains the original `update()` implementation for fallback.
- Several legacy globals still exist: `currentStepIndex`, `latestPackingLayout`, `latestSawmillCutPlan`, and `dimensions`.
- Some legacy canvas functions are still wrapped rather than fully extracted.

## Safe next step

Continue shrinking legacy `update()` and remove obsolete adapter layers only after the corresponding ViewModel-rendered behavior has been manually tested.
