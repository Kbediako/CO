# ACTION_PLAN: CO-270 Core Lane vs Full Test Matrix Contract

## Goal

Complete the Rework attempt for CO-270 from current `origin/main`, preserving the issue's exact test-contract surfaces and handing off only after validation, standalone review, and automated PR feedback drain are clean.

## Plan

1. Reset from the old PR attempt: close PR #570, delete the stale workpad, and work from a fresh branch based on `origin/main`.
2. Restore and refresh the docs-first packet so it describes the active Rework attempt, not the closed PR.
3. Record the required parallelization decision and use the same-issue child lane for the focused regression file.
4. Update parent-owned command/workflow/docs surfaces:
   - `package.json`
   - `.github/workflows/core-lane.yml`
   - `AGENTS.md`
   - `.agent/AGENTS.md`
   - `.agent/readme.md`
   - `docs/README.md`
5. Accept or reject the child-lane test patch, then run focused contract validation.
6. Run required guard/build/lint/test/docs/stewardship/diff-budget gates.
7. Run manifest-backed standalone review plus an explicit elegance/minimality pass.
8. Open a replacement PR, attach it to Linear, drain `pr ready-review`, refresh the workpad, and transition to `In Review` only if clean.

## Acceptance Checklist

- [x] Docs packet reflects Rework attempt truth.
- [x] `test:core` exists and is documented as the Core Lane matrix.
- [x] `npm run test` is documented as a default alias to `test:core`.
- [x] `test:all` exists and is documented as the broader adapter-inclusive matrix.
- [x] `eval:test` remains opt-in evaluation scope.
- [x] Core Lane workflow runs `npm run test:core`.
- [x] Focused regression covers scripts, workflow, argument forwarding, and adapter-only filter pass-through.

## Validation Checklist

- [x] Previous PR feedback sweep completed before new implementation.
- [x] Previous PR #570 closed for Rework reset.
- [x] Old Linear workpad deleted and fresh workpad created.
- [x] Required parallelization decision recorded.
- [x] Docs-review child stream attempted; failed at the expected intermediate state because docs referenced not-yet-created scripts/tests.
- [x] Same-issue test child lane completed and was accepted or rejected with evidence.
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
- [ ] PR checks and `pr ready-review` drain

## Risks

- Aggregate registry files can regress unrelated mainline entries if copied wholesale from a stale branch. Mitigation: update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` by adding only CO-270 rows on top of current `origin/main`.
- `test:all` can drop forwarded arguments if it simply chains `npm run test:core && npm run test:adapters`, and permanent positional filters can broaden focused adapter runs. Mitigation: use an explicit forwarding wrapper, scoped adapter/evaluation configs, and regression coverage.
- Docs can still overclaim Core Lane coverage. Mitigation: state `test:core`, `test:all`, and evaluation ownership separately in each protected docs surface.
