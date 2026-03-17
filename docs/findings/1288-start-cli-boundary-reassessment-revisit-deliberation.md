# Deliberation - 1288 Start CLI Boundary Reassessment Revisit

## Decision

Open `1288` as a truthful reassessment revisit, not an assumed extraction.

## Why

Current-tree inspection shows that `handleStart(...)` still owns broader binary-facing request shaping and policy injection above `orchestrator/src/cli/startCliShell.ts` than a thin parse-and-delegate wrapper would. That means the older local `start` freeze assumption should be revisited from the current code before naming the next seam.

## Evidence Focus

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/startCliShell.ts`
- `out/1271-coordinator-symphony-aligned-start-cli-shell-extraction/manual/20260317T074911Z-closeout/00-summary.md`
- `out/1287-coordinator-symphony-aligned-doctor-cli-remaining-boundary-freeze-reassessment/manual/20260317T144725Z-closeout/14-next-slice-note.md`
