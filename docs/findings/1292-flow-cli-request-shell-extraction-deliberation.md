# Deliberation - 1292 Flow CLI Request Shell Extraction

## Decision

Open `1292` as a real extraction lane.

## Why

The `1291` reassessment confirmed that `handleFlow(...)` still owns a meaningful binary-facing request-shaping seam above `flowCliShell.ts`. That is a real nearby extraction, not a forced symmetry slice.
