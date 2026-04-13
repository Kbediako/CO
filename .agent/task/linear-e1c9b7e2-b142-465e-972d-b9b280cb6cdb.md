# Task Checklist - linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb

- Linear Issue: `CO-168` / `e1c9b7e2-b142-465e-972d-b9b280cb6cdb`
- MCP Task ID: `linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb`
- Primary PRD: `docs/PRD-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`
- TECH_SPEC: `tasks/specs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`

## Docs-First
- [x] PRD drafted for the delegation MCP startup/lifecycle lane. Evidence: `docs/PRD-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`.
- [x] TECH_SPEC drafted with the bounded setup/doctor/cleanup contract. Evidence: `tasks/specs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`, `docs/TECH_SPEC-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry, review date, and current docs/review approvals. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`. Evidence: `.agent/task/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`.
- [x] Pre-implementation issue-quality review is captured in the spec packet. Evidence: `tasks/specs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`.
- [x] docs-review approval or explicit fallback captured for `linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb`. Evidence: `.runs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/cli/2026-04-13T05-44-46-601Z-d94802bb/provider-linear-worker-linear-audit.jsonl`, `out/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/manual/20260413T055822Z-docs-review-fallback.md`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: Linear audit via `linear transition` at `2026-04-13T05:45:59.740Z`.
- [x] The required turn-level parallelization decision was recorded for this active turn. Evidence: Linear audit via `linear parallelization` (`stay_serial` / `overlapping_scope`) at `2026-04-13T05:46:00Z`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear workpad comment `4dedf849-5342-43cd-9ff4-73957c65577e`, local source `out/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/manual/workpad.md`.
- [x] Workspace moved onto the issue branch before implementation. Evidence: local branch `linear/co-168-delegation-mcp-lifecycle`.

## Investigation
- [x] The setup/readiness mismatch is captured: setup still plans the wrapper form while live config can already point at the direct dist transport. Evidence: `docs/PRD-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`, `tasks/specs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`.
- [x] The doctor blind spot is captured: current doctor only checks delegation config presence. Evidence: `docs/PRD-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`, `tasks/specs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`.
- [x] The process-lifecycle contract is narrowed to orphaned stale delegate-server chains, not active parented processes. Evidence: `docs/PRD-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`, `tasks/specs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`.

## Implementation
- [x] Delegation setup/readiness uses the MCP-safe direct dist transport. Evidence: `orchestrator/src/cli/delegationSetup.ts`, `orchestrator/src/cli/delegationCliShell.ts`, `tests/cli-command-surface.spec.ts`.
- [x] Doctor reports delegation command safety, initialize timing/handshake posture, and stale-process findings. Evidence: `orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/utils/delegationMcpHealth.ts`, `orchestrator/tests/Doctor.test.ts`.
- [x] A bounded cleanup/remediation path exists for orphaned stale delegate-server chains. Evidence: `orchestrator/src/cli/delegationCliShell.ts`, `orchestrator/src/cli/utils/delegationMcpHealth.ts`, `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] Operator-facing docs describe the recovery path without manual process-table inspection. Evidence: `templates/README.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`, `docs/delegation-runner-workflow.md`.
- [x] Focused regressions cover setup/readiness, doctor health, and cleanup behavior. Evidence: `orchestrator/tests/DelegationSetup.test.ts`, `orchestrator/tests/DelegationCliShell.test.ts`, `orchestrator/tests/Doctor.test.ts`, `orchestrator/tests/DelegationMcpHealth.test.ts`, `tests/cli-command-surface.spec.ts`.

## Validation
- [x] Audited docs-review child stream recorded for this packet, or a truthful fallback note exists when the child-stream path fails closed. Evidence: `.runs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/cli/2026-04-13T05-44-46-601Z-d94802bb/provider-linear-worker-linear-audit.jsonl`, `out/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/manual/20260413T055822Z-docs-review-fallback.md`.
- [x] Focused delegation MCP tests pass. Evidence: `npm exec vitest run orchestrator/tests/DelegationSetup.test.ts orchestrator/tests/DelegationCliShell.test.ts orchestrator/tests/Doctor.test.ts`, `npm exec vitest run orchestrator/tests/DelegationMcpHealth.test.ts tests/cli-command-surface.spec.ts`.
- [x] Live command checks (`codex mcp get delegation --json`, `delegation setup --format json`, `doctor`) reflect the expected contract. Evidence: `out/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/manual/workpad.md`.
- [x] Required validation floor passes (`delegation-guard`, `spec-guard`, `build`, `lint`, `test`, `docs:check`, `docs:freshness`, `repo:stewardship`, `diff-budget`, `review`, `pack:smoke`). Evidence: `.runs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/cli/2026-04-13T05-44-46-601Z-d94802bb/review/telemetry.json`, `out/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/manual/workpad.md`.
- [x] Explicit elegance review recorded before review handoff. Evidence: `out/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/manual/elegance-review.md`.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: partial refreshes are recorded in `.runs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/cli/2026-04-13T05-44-46-601Z-d94802bb/provider-linear-worker-linear-audit.jsonl`; final pre-handoff refresh is still pending.
- [x] PR attached to the Linear issue before review-state transition. Evidence: `.runs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/cli/2026-04-13T05-44-46-601Z-d94802bb/provider-linear-worker-linear-audit.jsonl`, PR `#461`.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: issue state still `In Progress` in `.runs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/cli/2026-04-13T05-44-46-601Z-d94802bb/provider-linear-worker-linear-audit.jsonl`.
