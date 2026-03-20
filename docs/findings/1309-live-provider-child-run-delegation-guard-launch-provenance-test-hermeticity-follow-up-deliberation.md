# Findings - 1309 Live Provider Child-Run Delegation-Guard Launch-Provenance Test Hermeticity Follow-Up

## Decision
- Open `1309` as a narrow hermeticity fix lane for delegation-guard tests under provider-started parent env, not as another provider-runtime contract lane.

## Why this lane exists
- `1308` already proved the live `CO-2` run gets past runtime `delegation-guard`, `build`, and `lint`.
- The terminal live blocker is inside [`tests/delegation-guard.spec.ts`](../../tests/delegation-guard.spec.ts), not in runtime delegation guard itself.
- The strongest current hypothesis is concrete and narrow: the test helper that sanitizes child envs drops inherited provider launch provenance incorrectly when the parent process is itself provider-started.

## Evidence
- The live resumed run ended `stage:test:failed` with `8` failures in [`tests/delegation-guard.spec.ts`](../../tests/delegation-guard.spec.ts).
- The failure text shows nested dry-run cases receiving `Provider-started task id 'linear-lin-issue-1' did not originate from control-host launch provenance`.
- The current helper in [`tests/delegation-guard.spec.ts`](../../tests/delegation-guard.spec.ts) only deletes provider launch env keys when the candidate value equals the inherited `process.env` value, which is not enough to keep child envs hermetic under a provider-started parent.

## Rejected alternatives
- Reopening `1307` command-surface runtime isolation: not supported by the current live evidence.
- Weakening runtime `scripts/delegation-guard.mjs`: not justified because the live run already passes runtime delegation guard.
- Treating this as wording-only drift: too shallow, because the live parent env changes which code path the tests execute.

## Planned next step
- Register `1309`, reproduce the ambient-env failure locally, implement the smallest hermeticity fix, rerun the full floor, and replay live `CO-2`.
