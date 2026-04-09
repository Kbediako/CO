# ACTION_PLAN - CO STATUS: preserve canonical provider-worker activity truth and EVENT provenance end to end

## Added by Bootstrap 2026-04-09

## Summary
- Goal: land the smallest truthful source-of-truth fix, so STATUS carries canonical current-turn activity and explicit provenance end to end.
- Scope:
  - bootstrap the issue packet, registry mirrors, and single workpad
  - run audited `docs-review` before implementation
  - implement canonical activity persistence, hydration, ranking, and debug surfacing
  - add focused regressions and the full validation floor
- Assumptions:
  - current runtime, throughput, and unrelated STATUS semantics remain correct enough to preserve
  - the main defect is source-truth loss before rendering, not a dashboard-only ranking issue

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO STATUS`, `EVENT provenance`, `canonical current-turn activity`, `stdout JSONL first`, `session-log hydration second`, `child-stream / child-lane summaries as explicit derived candidates`, `selectedRunProjection`, `providerIssueObservability`, `providerLinearWorkerRunner`, `compatibilityIssuePresenter`
- Not done if:
  - generic worker-progress text still wins while richer current-turn activity exists
  - canonical activity does not survive persistence and hydration
  - operators still cannot inspect winner provenance and freshness
- Pre-implementation issue-quality review:
  - Current code and issue context agree that this is a bounded source-truth lane. `controlRuntime.ts` is already projection-first, `selectedRunProjection.ts` still promotes derived progress into `latestEvent`, `providerIssueObservability.ts` remains the main degradation seam, and `providerLinearWorkerRunner.ts` still persists narrowed proof fields without canonical activity provenance.

## Milestones & Sequencing
- [x] Register the `linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5` docs packet, task mirrors, and single workpad source, then run the audited `docs-review` child stream and record any truthful fallback. Evidence: `docs/PRD-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`, `tasks/tasks-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`, `.agent/task/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`, `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5-co-112-docs-review/cli/2026-04-09T05-39-47-373Z-741ea904/manifest.json`.
- [x] Audit the current proof persistence and hydration flow in `providerLinearWorkerRunner.ts`, `selectedRunProjection.ts`, and `providerIssueObservability.ts` against the known failure shape and existing regressions. Evidence: `docs/TECH_SPEC-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/providerIssueObservability.ts`.
- [x] Implement the smallest canonical activity contract and explicit candidate-ranking path across proof, projection, observability, and compatibility surfaces while keeping `controlStatusDashboard.ts` thin. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/providerIssueObservability.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/tests/CompatibilityIssuePresenter.test.ts`.
- [ ] Finish review handoff cleanly: keep focused regressions and follow-up review fixes green, refresh the workpad when the Linear cooldown lifts, and transition to `In Review` only after `pr ready-review` exits clean. Evidence in progress: `https://github.com/Kbediako/CO/pull/390`, `out/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5/manual/workpad.md`.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/providerIssueObservability.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`

## Validation
- [x] Audited `linear child-stream --pipeline docs-review`. Evidence: `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5-co-112-docs-review/cli/2026-04-09T05-39-47-373Z-741ea904/manifest.json`, `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5-co-112-docs-review/cli/2026-04-09T05-39-47-373Z-741ea904/review/telemetry.json`.
- [x] Focused proof, observability, projection, presenter, and runtime regressions. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/ProviderIssueObservability.test.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`, `orchestrator/tests/CompatibilityIssuePresenter.test.ts`, `orchestrator/tests/ControlRuntime.test.ts`.
- [x] Required local validation floor (`node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `FORCE_CODEX_REVIEW=1 npm run review`, `npm run pack:smoke`). Evidence: full floor passed before PR handoff prep on `ec862b969`; review telemetry at `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5/cli/2026-04-09T05-34-25-347Z-b97707fb/review/telemetry.json` reports `status: succeeded` and `review_outcome: bounded-success`.
- [x] Follow-up review-response delta for stale-floor rewind and proof provenance. Evidence: `npm run build`, `npx vitest run orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, and the same review telemetry root with a truthful manual correctness plus elegance fallback after the uncommitted wrapper hit `startup-anchor`.
- [ ] Final PR checks and `pr ready-review` drain on the latest head stay clean before the review-state transition. Evidence: pending current GitHub Actions / ready-review run for PR `#390`.
- Rollback plan:
  - keep the change bounded to canonical activity persistence and selection surfaces, so the lane remains revertible without touching unrelated STATUS behavior

## Risks & Mitigations
- `docs/TASKS.md` is already at the line cap before this packet is added.
  - Mitigation: use the repo-supported archive fallback after registering the new snapshot.
- Canonical activity may require a proof-shape change that touches multiple overlapping read paths.
  - Mitigation: keep the new contract additive and update observability/projection tests together.
- Session-log hydration can accidentally override fresher stdout truth.
  - Mitigation: rank candidates by provenance and freshness, with explicit timestamps and rejection reasons.

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream `co-112-docs-review` (`clean-success`)
- Manifest: `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5-co-112-docs-review/cli/2026-04-09T05-39-47-373Z-741ea904/manifest.json`
- Review telemetry: `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5-co-112-docs-review/cli/2026-04-09T05-39-47-373Z-741ea904/review/telemetry.json`
- Date: 2026-04-09
