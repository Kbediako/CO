# 1059 Deliberation - Standalone Review Low-Signal Drift Guard

## Why this slice exists

- `1058` fixed the structural split between live runtime enforcement and post-hoc telemetry parsing.
- Real `docs-review` evidence for `1058` still showed `npm run review` drifting through repeated `thinking` blocks and repeated nearby-file inspection without converging.
- Real Symphony research confirmed the right direction is one authoritative runtime owner plus thin wrapper/projection layers, but it also highlighted the remaining gap: Symphony supervises off canonical runtime facts, while CO still infers progress from line-parsed text.

## Chosen seam

Bounded low-signal drift classification is the next smallest seam because it:

- reuses the new `ReviewExecutionState` owner
- improves reliability without reopening broader wrapper architecture
- preserves CO’s advisory-only authority model

## Explicit non-choice

This slice does **not** attempt to:

- add automatic retries
- loosen heavy-command constraints
- copy Symphony’s autonomous approval or restart ownership
