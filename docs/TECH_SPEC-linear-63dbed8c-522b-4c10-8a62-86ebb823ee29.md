# TECH_SPEC: CO-270 Core Lane vs Full Test Matrix Contract

## Metadata

- Task id: `linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Registry id: `20260421-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Linear issue: `CO-270`
- Issue id: `63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Status: Rework implementation in progress
- Last review: `2026-04-21`
- PRD: `docs/PRD-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- Action plan: `docs/ACTION_PLAN-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- Task checklist: `tasks/tasks-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`

## Source Anchor

- Pointer: `ctx:sha256:15bab6d2b18fa5a71d0aaed22f8d1d12e6e4ec96cf968e818ddaf3fe34eda514#chunk:c000001`

## Required Command Contract

`package.json` must expose these scripts:

- `test`: `npm run test:core --`
- `test:core`: `vitest run --config vitest.config.core.ts`
- `test:all`: broader adapter-inclusive matrix that runs `test:core` and `test:adapters` while preserving forwarded args for both delegated runs
- `test:orchestrator`: `npm run test:core --`
- `test:adapters`: `vitest run --passWithNoTests --config vitest.config.ts adapters`
- `test:evaluation`: `vitest run --passWithNoTests --config vitest.config.ts evaluation/tests`
- `eval:test`: `npm run test:evaluation --`

`test:all` may use a shell wrapper to preserve forwarded arguments across both delegated npm runs.

## Workflow Contract

`.github/workflows/core-lane.yml` must name the test step as core-scoped and run:

```bash
npm run test:core
```

It must not run `npm run test` because that keeps the workflow contract ambiguous.

## Documentation Contract

The following docs must state that `npm run test` is the default alias to `test:core`, not the broader suite:

- `AGENTS.md`
- `.agent/AGENTS.md`
- `.agent/readme.md`
- `docs/README.md`

The same surfaces must identify `test:all` as the broader adapter-inclusive matrix and `eval:test` / `test:evaluation` as opt-in evaluation scope.

## Regression Contract

`tests/core-test-matrix-contract.spec.ts` must parse `package.json` and `.github/workflows/core-lane.yml` and assert:

- exact script mappings for `test`, `test:core`, `test:all`, `test:orchestrator`, `test:adapters`, `test:evaluation`, and `eval:test`
- delegated aliases preserve the `--` forwarding boundary
- Core Lane calls `npm run test:core`
- Core Lane does not call ambiguous `npm run test`

## Current / Reference / Target Matrix

| Surface | Current truth before CO-270 | Reference truth | Target truth |
| --- | --- | --- | --- |
| Core Lane test step | Workflow runs `npm run test`, which resolves to the core config. | `vitest.config.core.ts` excludes adapters and evaluation tests. | Workflow runs explicit `npm run test:core`. |
| Default local test | `npm run test` reads repo-wide but is core-only. | The current default should remain narrow unless deliberately changed. | `npm run test` aliases `test:core` and docs say so. |
| Broader matrix | Adapter command exists but no first-class `test:all`. | Broader validation should be named explicitly. | `test:all` runs core plus adapters. |
| Evaluation lane | `eval:test` exists but is easy to confuse with default validation. | Evaluation is opt-in when evaluation scope is touched. | `eval:test` aliases `test:evaluation` and docs keep it separate. |

## Validation Plan

- `npm run test:core -- tests/core-test-matrix-contract.spec.ts`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run test`
- required full handoff gates from `AGENTS.md` before review state transition

## Non-Goals

- No blanket Core Lane expansion.
- No adapter or evaluation command deletion.
- No unrelated CI performance work.
- No changes to `vitest.config.core.ts` or `vitest.config.ts` unless the contract test proves a mismatch requiring a narrow fix.
