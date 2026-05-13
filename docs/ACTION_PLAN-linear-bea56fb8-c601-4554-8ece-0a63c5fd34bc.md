# ACTION_PLAN - CO STATUS: restore truthful default operator telemetry and Symphony parity

## Added by Bootstrap 2026-04-04

## Summary
- Goal: land one bounded fix pass over the default visible `CO STATUS` contract so the operator-facing surface is truthful end to end and materially aligned with Symphony’s better semantics.
- Scope: docs-first packet, audited docs-review child stream, status-surface audit, bounded implementation across default launch behavior plus header or row telemetry plus rate limits, focused regressions, real-device screenshots, and pre-handoff review gates.
- Assumptions:
  - `controlStatusDashboard.ts` is the primary visible rendering surface
  - Symphony remains the local semantics reference for PID, event humanization, and unavailable-state behavior
  - the lane can stay bounded to status/read-model seams without reopening broader dashboard design or provider architecture

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `co-status`, `Dashboard:`, `Tokens`, `Throughput`, `Rate Limits`, `EVENT`, `PID`, `AGE / TURN`, `TOKENS`, `SESSION`, and the requirement for real screenshots embedded directly in Linear.
- Not done if:
  - default `co-status` still auto-starts or advertises the dashboard
  - visible telemetry remains empty, misleading, or unverified during real active usage
  - rate-limit output still leaks internal source text or unclear reset semantics
  - screenshots are missing or synthetic
- Pre-implementation issue-quality review: approved as one full visible-surface truth lane, not a single-field fix.

## Milestones & Sequencing
- [x] Register the `linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc` docs packet, task mirrors, and single Linear workpad with the initial audit notes. Evidence: `docs/PRD-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`, `docs/TECH_SPEC-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`, `docs/ACTION_PLAN-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`, `tasks/specs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`, `tasks/tasks-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`, `.agent/task/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`, `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/workpad.md`.
- [x] Run the audited `docs-review` child stream and fold back any packet fixes before implementation. Evidence: `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`, `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/review/telemetry.json`.
- [x] Audit the CO status data path against Symphony to locate the smallest truthful seams for default dashboard launch and URL rendering, header token and throughput telemetry, rate-limit presentation, and row PID or event or turn or session or token semantics. Evidence: `tasks/specs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`, `docs/TASKS.md`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`, `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/orchestrator_status_test.exs`.
- [x] Implement the bounded fixes and expand focused regression coverage for the full visible status contract. Evidence: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/control/operatorDashboardPresenter.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/CodexOrchestratorCli.test.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [ ] Capture real-device screenshots, run the required validation floor plus standalone/elegance review, and refresh the workpad for PR and review handoff. Evidence: screenshot bundle is present at `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/co78-live.png`, `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/co78-paused.png`, `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/co78-compact.png`, `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/co78-empty.png`, and `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/co78-degraded.png`; final review-handoff drain is still pending.

## Dependencies
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/tests/ControlStatusDashboard.test.ts`
- local CO status/read-model helpers discovered during the audit
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
- `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/orchestrator_status_test.exs`

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-78-docs-review --format json`. Evidence: `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`, `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/review/telemetry.json`.
- [x] Focused status/dashboard tests for launch/default behavior, telemetry aggregation, rate-limit rendering, row semantics, degraded states, and the shutdown follow-up seam. Evidence: `orchestrator/tests/ControlStatusDashboard.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/CodexOrchestratorCli.test.ts`.
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node scripts/delegation-guard.mjs`. Evidence: `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/workpad.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/workpad.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run build`. Evidence: `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/workpad.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run lint`. Evidence: `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/workpad.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run test`. Evidence: `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/workpad.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run docs:check`. Evidence: `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/workpad.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run docs:freshness`. Evidence: `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/workpad.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node scripts/diff-budget.mjs`. Evidence: `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/workpad.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/workpad.md` records the executed wrapper run plus the manual fallback review after the wrapper drifted without a concrete diff-local verdict.
- [x] `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run pack:smoke`. Evidence: `out/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc/manual/workpad.md`.
- Rollback plan:
  - if the dashboard-default change breaks a required opt-in path, revert only that behavior and keep the rest of the visible-truth fixes while filing a follow-up with concrete evidence
  - if a row or header telemetry source cannot be made authoritative without widening scope, fall back to explicit `n/a` semantics and create a follow-up for the missing upstream telemetry seam

## Risks & Mitigations
- Risk: the visible bug is partly upstream data loss rather than only rendering.
  - Mitigation: audit the read-model path first and fix the smallest shared seam rather than papering over empties in the renderer.
- Risk: rate-limit semantics become less trustworthy if reset timestamps are ambiguous.
  - Mitigation: keep only authoritative human-readable reset output and remove raw countdown text when it cannot be trusted.
- Risk: Symphony parity pressure widens the lane.
  - Mitigation: follow Symphony only where it clearly improves operator value on the current visible contract; file a follow-up for larger parity gaps.

## Approvals
- Reviewer: `codex-orchestrator docs-review` approved with `review_outcome: clean-success`
- Date: 2026-04-04
- Manifest: `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`
