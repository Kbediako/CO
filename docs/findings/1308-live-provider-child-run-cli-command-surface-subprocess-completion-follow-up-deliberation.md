# Findings - 1308 Live Provider Child-Run CLI Command-Surface Subprocess Completion Follow-Up

## Decision
- Keep `1308` open as a narrow reassessment and live-rerun lane, not as a code-fix lane.

## Why this lane exists
- `1307` already added deterministic `cli` runtime env defaults in [`tests/cli-command-surface.spec.ts`](../../tests/cli-command-surface.spec.ts) so ordinary command-surface subprocess coverage no longer inherits the operator's ambient runtime mode.
- Fresh remeasurement on the current tree shows the focused suite is long but terminal: [`tests/cli-command-surface.spec.ts`](../../tests/cli-command-surface.spec.ts) passed `100/100` tests in about `297.91s`.
- The remaining truthful work is now patience-first rerun evidence for the full local validation floor and the live provider child run, not an invented CLI entrypoint fix.

## Evidence
- Existing `1307` scout runs already showed the quiet long tail staying inside [`tests/cli-command-surface.spec.ts`](../../tests/cli-command-surface.spec.ts).
- Fresh current-turn remeasurement completed terminally: `npx vitest run --config vitest.config.core.ts tests/cli-command-surface.spec.ts --reporter=dot` reported `100/100` tests passed in `297.91s`.
- The runtime-env helper patch is present on the current tree, and the focused rerun did not justify reopening that contract.

## Rejected alternatives
- Reopening provider-intake or delegation-guard contract work: not supported by the current blocker evidence.
- Reopening runtime-env selection as the primary hypothesis: contradicted by the fresh focused terminal pass after the `1307` helper patch.
- Inventing a CLI entry/import-time fix without a fresh reproduction: not justified by the current evidence.

## Planned next step
- Use the delegated read-only stream plus the corrected docs packet to rerun the full validation floor and the live provider replay, then stop at the next exact blocker if one still exists.
