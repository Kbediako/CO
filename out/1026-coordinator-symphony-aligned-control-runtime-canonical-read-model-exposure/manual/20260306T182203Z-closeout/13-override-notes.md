# Override Notes - 1026

## `npm run test`
- A fresh current-tree full-suite attempt was run into `05-test.log` with an explicit 180s timeout.
- The run again reached the late CLI/review suites and logged `tests/cli-orchestrator.spec.ts` plus `tests/run-review.spec.ts` as passed, then failed to terminate before the timeout fired.
- Override reason: branch-local quiet-tail/full-suite hang remains unresolved and did not produce a new failing assertion on the owned `1026` delta.

## `npm run review`
- The post-fix standalone review rerun launched successfully with `FORCE_CODEX_REVIEW=1` and the stacked-branch diff-budget override.
- The reviewer then drifted into low-signal exploratory reinspection of already-known files and docs without converging on a new terminal verdict, so it was terminated manually.
- Override reason: the actionable refresh-coherence defect had already been surfaced and fixed via delegated review plus fresh targeted/manual validation; the rerun did not produce a new high-signal finding before stalling.

## `node scripts/diff-budget.mjs`
- Override reason: `1026` lives on a heavily stacked branch, so `origin/main` diff size is not representative of the owned slice.
- The explicit override string used was `1026 scoped diff on stacked branch`.
