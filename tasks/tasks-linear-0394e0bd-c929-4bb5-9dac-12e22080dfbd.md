# Task Checklist - linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd

- Linear Issue: `CO-424` / `0394e0bd-c929-4bb5-9dac-12e22080dfbd`
- MCP Task ID: `linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd`
- Primary PRD: `docs/PRD-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- TECH_SPEC: `tasks/specs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- Agent mirror: `.agent/task/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- Worktree: `.workspaces/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd`
- Branch: `kb/co-424-traceability-packet`

## Docs-First
- [x] PRD drafted with user-request translation, protected terms, wrong interpretations, non-goals, Not Done If, and acceptance criteria. Evidence: `docs/PRD-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.
- [x] Canonical TECH_SPEC and TECH_SPEC mirror drafted. Evidence: `tasks/specs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`, `docs/TECH_SPEC-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.
- [x] ACTION_PLAN drafted and refreshed for implementation boundaries. Evidence: `docs/ACTION_PLAN-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.
- [x] Registry mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Protected Issue Terms
- [x] `parallelization_serial_conflict`
- [x] `parallelization_decision_missing`
- [x] `stay_serial`
- [x] `forbid_parallel`
- [x] `same-issue child lanes`
- [x] `review handoff`
- [x] `merge handoff`
- [x] `post-merge/Done closeout`
- [x] `provider-linear-worker`
- [x] `proof lock`
- [x] `CO-423`
- [x] `PR #721`

## Scope Control
- [x] Initial traceability packet preserved the CO-424 issue-shaping contract before source/test work. Evidence: PRD, TECH_SPEC, and ACTION_PLAN history.
- [x] Packet and mirrors now describe the implemented source/test scope. Evidence: canonical TECH_SPEC implementation requirements.
- [x] Packet rejects active-turn invariant weakening. Evidence: PRD Not Done If and TECH_SPEC Readiness Gate.
- [x] Packet rejects fake same-issue child lanes for `review handoff`, `merge handoff`, or `post-merge/Done closeout`. Evidence: PRD wrong interpretations and ACTION_PLAN risks.
- [x] Packet keeps `proof lock` safety protected. Evidence: PRD and canonical TECH_SPEC.

## Implementation
- [x] Inspected `orchestrator/src/cli/providerLinearWorkerRunner.ts` closeout/lifecycle sequencing. Evidence: lineage-aware filtering and lifecycle-closeout patch in `resolveProviderLinearWorkerParallelizationFailure(...)` path.
- [x] Added focused regression for post-handoff false `parallelization_decision_missing`. Evidence: `ProviderLinearWorkerRunner.test.ts` CO-423-style review handoff and post-merge/Done closeout cases.
- [x] Added focused regression for post-handoff false `parallelization_serial_conflict`. Evidence: prior `parallelize_now` child-lane residue tests for later `stay_serial` / `forbid_parallel` closeout decisions.
- [x] Proved true active-turn invariant failures still fail closed. Evidence: same-decision `stay_serial` / `forbid_parallel` child-lane launch tests remain failing closed.
- [x] Kept missing-decision closeout waiver audit-scoped. Evidence: blocked queued issue and `attach-pr` non-closeout audit regressions still fail `parallelization_decision_missing`.
- [x] Demoted repeated stale proof-lock diagnostics when a distinct terminal cause exists. Evidence: `CommandRunnerReviewEvidenceConsistency.test.ts` provider proof-lock diagnostic test.
- [x] Same-issue child lane launched for tests. Evidence: child run `2026-05-05T17-36-54-901Z-aeadba63`; patch artifact applied after `git apply --check`; helper later invalidated the stale-base ledger entry after branch head advanced.

## Validation
- [x] `git status --short --branch`. Evidence: branch `kb/co-424-traceability-packet` refreshed onto `origin/main` and included in PR `#764`.
- [x] Protected-term and packet-path `rg` checks. Evidence: protected terms and six packet paths found across packet files, `docs/TASKS.md`, `tasks/index.json`, and `docs/docs-freshness-registry.json`.
- [x] JSON parse for `tasks/index.json`. Evidence: `json ok`.
- [x] JSON parse for `docs/docs-freshness-registry.json`. Evidence: `json ok`.
- [x] `git diff --check`. Evidence: clean.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] `npm run docs:check`. Evidence: `docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 5231 docs, 5234 registry entries`.
- [x] `codex-orchestrator start docs-review --task linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd`. Evidence: `.runs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd/cli/2026-05-05T17-17-24-275Z-e66407e3/manifest.json`; review ran on `gpt-5.5` / `xhigh` via appserver, no fallback, and completed with `review_outcome=clean-success`.
- [x] Docs-review `NOTES` evidence recorded for the manifest-backed review gate. Evidence: packet-scope docs review completed cleanly on `gpt-5.5` / `xhigh` appserver with no fallback before this implementation pass.
- [x] `npm run build -- --pretty false`. Evidence: TypeScript build passed after implementation patch.
- [x] Focused provider-worker regressions. Evidence: `npx vitest run orchestrator/tests/ProviderLinearWorkerRunner.test.ts --testNamePattern "CO-423-style|blocked queued issue state|non-closeout audit work|prior parallelize_now child-lane residue|same-decision child lane|dirty closeout|mismatched child-lane lineage"`; 9 passed.
- [x] Focused proof-lock diagnostic regression. Evidence: `npx vitest run orchestrator/tests/CommandRunnerReviewEvidenceConsistency.test.ts --testNamePattern "provider proof-lock diagnostics|failed provider-worker command summaries"`; 2 passed.
- [x] Manifest-backed standalone review. Evidence: `.runs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd/cli/2026-05-05T17-34-04-030Z-d6775985/review/telemetry.json` reports `status=succeeded` and `review_outcome=bounded-success`; earlier P2 findings were fixed and rerun.
- [x] Explicit elegance/minimality pass. Evidence: `out/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd/manual/elegance-review.md`.
- [ ] `unresolved-review-threads` gate verifies unresolved actionable review threads = `0` or documents an explicit waiver before merge/closeout. Evidence: pending PR `#764` current-head review rerun and `ready-review` quiet-window drain.

## Notes
- Implementation is now in this lane; source/test changes remain bounded to provider-worker closeout and command summary diagnostics.
- Historical `CO-423` / `PR #721` content remains trace evidence only.
- The tests child lane completed successfully but the helper invalidated the ledger entry after the parent branch advanced from the child base; parent imported the verified patch artifact on current head.
