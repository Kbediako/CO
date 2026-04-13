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
- [ ] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: pending.
- [ ] `docs/TASKS.md` updated with the new lane snapshot. Evidence: pending.
- [ ] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: pending.
- [x] Checklist mirrored to `.agent/task/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`. Evidence: `.agent/task/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`.
- [x] Pre-implementation issue-quality review is captured in the spec packet. Evidence: `tasks/specs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`.
- [ ] docs-review approval captured for `linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb`. Evidence: pending.

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
- [ ] Delegation setup/readiness uses the MCP-safe direct dist transport. Evidence: pending.
- [ ] Doctor reports delegation command safety, initialize timing/handshake posture, and stale-process findings. Evidence: pending.
- [ ] A bounded cleanup/remediation path exists for orphaned stale delegate-server chains. Evidence: pending.
- [ ] Operator-facing docs describe the recovery path without manual process-table inspection. Evidence: pending.
- [ ] Focused regressions cover setup/readiness, doctor health, and cleanup behavior. Evidence: pending.

## Validation
- [ ] Audited docs-review child stream recorded for this packet. Evidence: pending.
- [ ] Focused delegation MCP tests pass. Evidence: pending.
- [ ] Live command checks (`codex mcp get delegation --json`, `delegation setup --format json`, `doctor`) reflect the expected contract. Evidence: pending.
- [ ] Required validation floor passes (`delegation-guard`, `spec-guard`, `build`, `lint`, `test`, `docs:check`, `docs:freshness`, `repo:stewardship`, `diff-budget`, `review`, `pack:smoke`). Evidence: pending.
- [ ] Explicit elegance review recorded before review handoff. Evidence: pending.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue remains active until review handoff prerequisites are complete. Evidence: pending.
