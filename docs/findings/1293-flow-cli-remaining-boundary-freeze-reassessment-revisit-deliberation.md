# Deliberation - 1293 Flow CLI Remaining Boundary Freeze Reassessment Revisit

## Decision

Open `1293` as a reassessment lane, not an extraction lane.

## Why

`1292` moved the remaining binary-facing request shaping into `flowCliRequestShell.ts`. The next truthful question is whether the local `flow` wrapper is now exhausted. That should be answered explicitly from current code instead of assuming another synthetic follow-on extraction.
