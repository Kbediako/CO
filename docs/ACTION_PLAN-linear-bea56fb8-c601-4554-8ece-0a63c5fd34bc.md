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
1. Register the `linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc` docs packet, task mirrors, and single Linear workpad with the initial audit notes.
2. Run the audited `docs-review` child stream and fold back any packet fixes before implementation.
3. Audit the CO status data path against Symphony to locate the smallest truthful seams for:
   - default dashboard launch and URL rendering
   - header token and throughput telemetry
   - rate-limit presentation
   - row PID/event/turn/session/token semantics
4. Implement the bounded fixes and expand focused regression coverage for the full visible status contract.
5. Capture real-device screenshots, run the required validation floor plus standalone/elegance review, and refresh the workpad for PR and review handoff.

## Dependencies
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/tests/ControlStatusDashboard.test.ts`
- local CO status/read-model helpers discovered during the audit
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
- `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/orchestrator_status_test.exs`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-78-docs-review --format json`
  - focused status/dashboard tests for launch/default behavior, telemetry aggregation, rate-limit rendering, row semantics, and degraded states
  - `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run build`
  - `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run test`
  - `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc npm run pack:smoke`
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
- Reviewer: Pending `codex-orchestrator docs-review`
- Date: 2026-04-04
