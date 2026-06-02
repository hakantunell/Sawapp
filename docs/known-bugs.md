# Known bugs

## Sawmill/packing with only center block dimension

Status: known pre-existing or unverified bug. Do not fix as part of the current refactoring unless a later test proves that it was introduced by the refactor.

### Scenario

- Optimization mode: `sawmill` / packing
- Active dimensions: only a fixed center block, for example `170 × 170`
- No active side-yield dimensions

### Observed behavior

The saw plan behaves strangely:

- It still presents a sawmill/packing plan with only one piece.
- Some steps show inconsistent support heights.
- At least one step can show `Stöd 1: 0 mm` and `Stöd 2: 0 mm`.
- The visual blade/support position looks wrong for some rotations.

### Expected behavior

If there are no side pieces to release, sawmill/packing mode should probably either:

1. fall back to the normal timber/blocking saw plan, or
2. build a valid center-block-only sawmill plan with correct support heights.

### Refactoring decision

Leave this bug for later.

Current refactoring policy:

> Only fix regressions caused by the refactoring. Pre-existing calculation or optimization bugs are documented and handled separately.

### Suspected area

Likely candidates:

- `computeSawmillPacking(...)`
- `buildSawmillCutPlan(...)`
- center-only layout handling
- support-height calculation when `packingLayout` contains only a center block
