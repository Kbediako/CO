# Task Checklist: CO-270 Core Lane vs Full Test Matrix Contract

## Scope

- Task id: `linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Registry id: `20260421-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Linear issue: `CO-270`
- Issue id: `63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Current attempt: Rework reset from `origin/main`

## Docs Checklist

- [x] PRD refreshed: `docs/PRD-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- [x] TECH_SPEC refreshed: `docs/TECH_SPEC-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- [x] ACTION_PLAN refreshed: `docs/ACTION_PLAN-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- [x] Task spec refreshed: `tasks/specs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- [x] Task checklist refreshed: `tasks/tasks-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- [x] Agent task mirror refreshed: `.agent/task/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- [x] Registry mirrors updated without regressing unrelated mainline entries.

## Implementation Checklist

- [x] Previous PR #570 closed for Rework reset.
- [x] Fresh branch created from `origin/main`.
- [x] Required parallelization decision recorded.
- [x] Same-issue test child lane completed and patch accepted or rejected.
- [x] `package.json` exposes `test:core`, `test:all`, and forwarding aliases.
- [x] Core Lane workflow uses `npm run test:core`.
- [x] Agent docs distinguish core, broader adapter-inclusive, and opt-in evaluation lanes.
- [x] Regression coverage asserts the contract.

## Validation Checklist

- [x] PR feedback sweep completed before new implementation.
- [x] Docs-review child stream attempted; failure recorded at intermediate missing-script/missing-test state.
- [x] `npm run test:core -- tests/core-test-matrix-contract.spec.ts`
- [x] `node scripts/delegation-guard.mjs`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] `npm run repo:stewardship`
- [x] `node scripts/diff-budget.mjs`
- [x] Manifest-backed standalone review final rerun after addressing P2
- [x] Elegance/minimality pass
- [ ] Replacement PR attached and `pr ready-review` drain clean

## Notes

Do not mark this task complete while `npm run test` still reads as repo-wide, while Core Lane still calls ambiguous `npm run test`, or while `test:all` / evaluation ownership is missing from docs.
