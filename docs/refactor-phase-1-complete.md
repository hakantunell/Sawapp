# Refactor phase 1 complete

Status: completed and browser-tested.

## Summary

The first major Sawapp refactoring phase is complete.

The original monolithic `app.js` is no longer part of the bootstrap flow. The active runtime now uses modular files under `src/` and thin compatibility controllers under `src/legacy-app/`.

## Current architecture

The normal update flow is now:

```text
90-update.js
  -> SawUpdateOrchestrator
  -> SawUpdatePipeline
  -> SawUpdateRendering
  -> render-* modules / canvas parts
```

Primary data flow:

```text
view-model.js
  -> UpdateContext
  -> renderers
```

Canvas rendering has been split into dedicated parts:

```text
src/timber-canvas-parts.js
src/packing-canvas-parts.js
```

The former large canvas files are now thin controllers:

```text
src/legacy-app/60-timber-canvas.js
src/legacy-app/80-packing-canvas.js
```

The update file is also now a thin controller/event wiring layer:

```text
src/legacy-app/90-update.js
```

## Completed refactoring goals

- `90-update.js` reduced to controller/event wiring.
- `60-timber-canvas.js` reduced to a timber canvas orchestrator.
- `80-packing-canvas.js` reduced to a packing canvas orchestrator.
- ViewModel is the primary source for update context.
- Shared update rendering is handled through `SawUpdateRendering`.
- Debug update adapter has been removed from bootstrap.
- The application has been manually browser-tested after the refactoring.

## Recommended next phase

Do not continue with large structural refactorings for now.

Recommended next steps:

1. Stabilize through normal use.
2. Remove clearly unused code only when found.
3. Start building new functionality on top of the new structure.
4. Rename/move files out of `legacy-app/` later, only when the code is touched for functional reasons.

Suggested next product work:

- multiple diameter measurements per log
- improved saw strategy
- better mobile workflow
- import/export
- voice input

## Notes

The `legacy-app/` name is now partly historical. Some files there are active compatibility controllers rather than legacy logic. Avoid large renames until the application has been used for a while in its current structure.
