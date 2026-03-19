# Deliberation - 1291 Flow CLI Boundary Reassessment Revisit

## Decision

Open `1291` as a truthful reassessment revisit, not an assumed extraction.

## Why

Current-tree inspection shows that `handleFlow(...)` still owns broader binary-facing request shaping and helper injection above `orchestrator/src/cli/flowCliShell.ts` than a thin parse-and-delegate wrapper would. That means the older local `flow` freeze assumption should be revisited from current code before naming the next seam.
