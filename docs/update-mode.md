# Update mode feature flag

Sawapp currently supports two update modes.

## Legacy mode

Default mode.

Runtime flow:

```text
legacy update()
  ↓
update-render-extract-adapter
  ↓
ViewModel
  ↓
extracted renderers
```

This is the safest mode because legacy `update()` still runs first.

## ViewModel mode

Feature-flagged mode.

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

It is intended to become the future default once it has been tested enough.

## Temporary activation

From the browser console:

```javascript
enableViewModelUpdateDebug()
```

Disable:

```javascript
disableViewModelUpdateDebug()
```

## Persistent activation

Enable ViewModel mode across reloads:

```javascript
enableViewModelUpdateFeatureFlag()
```

Disable persistent ViewModel mode:

```javascript
disableViewModelUpdateFeatureFlag()
```

Persistent state is stored in localStorage:

```text
sawapp.viewModelUpdate.enabled
```

## URL activation

Enable for one URL/session:

```text
?viewModelUpdate=1
```

Disable for one URL/session:

```text
?viewModelUpdate=0
```

## Status after initial testing

The ViewModel mode has been manually tested with:

- sawmill/packing optimization
- timber/block optimization
- dimensions
- large-screen step view
- rotation changes
- step navigation

Known issue found and fixed:

- timber canvas did not update outside sawmill/packing mode because legacy `renderTimberCanvas()` still reads `currentStepIndex` and `latestPackingLayout`.
- `src/render-timber-canvas.js` now syncs the legacy step index and clears stale packing layout before calling legacy canvas rendering.

## Safe next step

Keep legacy mode as default until ViewModel mode has been tested over more real saw scenarios.

Once stable:

1. Set ViewModel mode as default.
2. Keep `?viewModelUpdate=0` / localStorage disable as fallback.
3. Start shrinking legacy `update()`.
