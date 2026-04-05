# ACTION_PLAN - CO: Restore authoritative CO STATUS telemetry for stage, event, tokens, throughput, session, and rate limits

## Added by Bootstrap 2026-04-05

## Summary
- Goal: repair the authoritative live telemetry path so active provider-worker/appserver `CO STATUS` becomes truthful for stage, event, tokens, throughput, session, turn lineage, and Codex usage windows.
- Scope: docs-first packet, single Linear workpad, audited docs-review child stream, bounded telemetry/projection implementation, focused regressions, real-device screenshots, and the required review gates.
- Assumptions:
  - the main fix seam is parser/proof/projection fidelity rather than layout alone
  - Symphony remains the reference for humanized event and rate-limit semantics
  - current proof fields are sufficient if their normalization and downstream preference are corrected

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `Tokens`, `Throughput`, `TOKENS`, `SESSION`, `AGE / TURN`, `STAGE`, `EVENT`, and Codex `5-hour` / `weekly` wording.
- Not done if:
  - active runs still render empty/generic values where authoritative runtime telemetry exists
  - `STAGE` still collapses to raw `in_progress`
  - `EVENT` still collapses to low-signal generic fallback
  - Codex `5-hour` / `weekly` usage windows remain absent or mislabeled
  - screenshots are missing from the Linear workpad
- Pre-implementation issue-quality review: approved as one bounded telemetry/projection truth lane, not a renderer-only patch.

## Milestones & Sequencing
- [x] Register the `linear-6e5a9260-4822-453b-ba5b-aa513849e06e` docs packet, task mirrors, and initial workpad source with the initial telemetry-path audit notes. Evidence: `docs/PRD-linear-6e5a9260-4822-453b-ba5b-aa513849e06e.md`, `docs/TECH_SPEC-linear-6e5a9260-4822-453b-ba5b-aa513849e06e.md`, `docs/ACTION_PLAN-linear-6e5a9260-4822-453b-ba5b-aa513849e06e.md`, `tasks/specs/linear-6e5a9260-4822-453b-ba5b-aa513849e06e.md`, `tasks/tasks-linear-6e5a9260-4822-453b-ba5b-aa513849e06e.md`, `.agent/task/linear-6e5a9260-4822-453b-ba5b-aa513849e06e.md`, `out/linear-6e5a9260-4822-453b-ba5b-aa513849e06e/manual/workpad.md`.
- [ ] Run the audited `docs-review` child stream and fold back any packet fixes before implementation. Evidence: pending.
- [ ] Repair the authoritative telemetry path across parser/proof/projection seams for session, turn, tokens, event/message, operator-visible stage, and Codex usage windows. Evidence: pending.
- [ ] Expand focused regression coverage for runtime JSONL parsing, proof aggregation, stage/event projection, and terminal rate-limit presentation. Evidence: pending.
- [ ] Capture real-device screenshots, run the required validation floor plus standalone/elegance review, and refresh the workpad for PR/review handoff. Evidence: pending.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
- `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/orchestrator_status_test.exs`

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-6e5a9260-4822-453b-ba5b-aa513849e06e node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-83-docs-review --format json`. Evidence: pending.
- [ ] Focused parser/projection/dashboard regressions for token/session/turn extraction, stage/event projection, throughput, and Codex rate-limit rendering. Evidence: pending.
- [ ] Capture terminal screenshot proof showing corrected live `CO STATUS` output during active usage on this device and embed it directly in Linear. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-6e5a9260-4822-453b-ba5b-aa513849e06e node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-6e5a9260-4822-453b-ba5b-aa513849e06e node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-6e5a9260-4822-453b-ba5b-aa513849e06e npm run build`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-6e5a9260-4822-453b-ba5b-aa513849e06e npm run lint`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-6e5a9260-4822-453b-ba5b-aa513849e06e npm run test`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-6e5a9260-4822-453b-ba5b-aa513849e06e npm run docs:check`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-6e5a9260-4822-453b-ba5b-aa513849e06e npm run docs:freshness`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-6e5a9260-4822-453b-ba5b-aa513849e06e node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-6e5a9260-4822-453b-ba5b-aa513849e06e FORCE_CODEX_REVIEW=1 npm run review`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-6e5a9260-4822-453b-ba5b-aa513849e06e npm run pack:smoke`. Evidence: pending.
- Rollback plan:
  - if richer Codex rate-limit parsing proves incompatible with an older payload shape, preserve the existing generic bucket support and add the richer normalization in a backwards-compatible branch
  - if operator-visible stage promotion breaks retry/runtime semantics, keep the richer stage semantics scoped to active running rows and file a follow-up for broader issue-payload normalization

## Risks & Mitigations
- Risk: active appserver-backed telemetry payloads differ from the older parser expectations.
  - Mitigation: extend normalization with additive shape support and prove it with focused tests.
- Risk: stage/event changes blur runtime state with workflow phase.
  - Mitigation: keep `STAGE` and `EVENT` distinct, with explicit preference rules and focused regression coverage.
- Risk: Codex usage-window formatting widens the lane.
  - Mitigation: reuse Symphony/reference semantics where possible and keep the rendering additive to current generic bucket support.

## Approvals
- Reviewer: pending `codex-orchestrator docs-review`
- Date: 2026-04-05
- Manifest: pending
