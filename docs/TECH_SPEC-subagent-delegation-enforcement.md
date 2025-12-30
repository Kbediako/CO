# Technical Spec - Subagent Delegation Enforcement (Task 0918)

Source of truth for requirements: `tasks/0918-prd-subagent-delegation-enforcement.md`.

## Overview
- Objective: Enforce subagent delegation for top-level tasks and make delegation evidence a first-class guardrail.
- In Scope:
  - A delegation guard script that verifies subagent manifest evidence for top-level tasks.
  - Pipeline integration for delegation guard checks.
  - Documentation and template updates to require delegation evidence.
- Out of Scope:
  - Auto-spawning subagents or managing parallel run scheduling.
  - New manifest schema fields or orchestration primitives.
  - Enforcement for subagent runs themselves.

## Architecture & Design
### Current State
- Top-level agents are advised to delegate but the workflow does not require it.
- Checklists include optional subagent evidence fields with inconsistent usage.
- Orchestrator pipelines only enforce spec-guard and other build/test gates.

### Proposed Changes
#### Delegation guard script
- Add `scripts/delegation-guard.mjs` with the following behavior:
  - Requires `MCP_RUNNER_TASK_ID` to be set.
  - Reads `tasks/index.json` to resolve canonical top-level task IDs.
  - If the current `MCP_RUNNER_TASK_ID` matches a top-level task ID, require at least one subagent manifest under `.runs/<task-id>-*/cli/<run-id>/manifest.json`.
  - If the current task ID is a subagent ID (starts with a known top-level task ID + `-`), skip enforcement.
  - If the task ID does not map to a known top-level task, fail with a message to update `tasks/index.json` or use an override.
  - Support `DELEGATION_GUARD_OVERRIDE_REASON` as an explicit escape hatch (logged output required).
  - Respect `CODEX_ORCHESTRATOR_RUNS_DIR` if set; otherwise use `.runs/`.

#### Pipeline integration
- Add `node scripts/delegation-guard.mjs` to the core pipelines (`docs-review`, `implementation-gate`, `implementation-gate-devtools`, diagnostics) ahead of spec-guard so failures are captured early.
- Ensure delegation guard is treated as a required gate for top-level runs.

#### Documentation + template updates
- Update `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, and `.agent/SOPs/agent-autonomy-defaults.md` to mandate delegation for top-level tasks.
- Update `.agent/task/templates/tasks-template.md` and `.agent/task/templates/subagent-request-template.md` to require subagent evidence and naming conventions.

## Data Persistence / State Impact
- No manifest schema changes; evidence is inferred from existing `.runs/<task-id>-*/cli/<run-id>/manifest.json` paths.

## External Dependencies
- None beyond existing Codex CLI and orchestrator pipelines.

## Operational Considerations
- Failure Modes:
  - `MCP_RUNNER_TASK_ID` unset when guard runs.
  - Top-level task not registered in `tasks/index.json`.
  - Subagent run exists but has no manifest (incomplete run).
- Observability & Telemetry:
  - Guard outputs explicit success/failure messages; failures are recorded in pipeline manifests.
- Security / Privacy:
  - No new secrets or external calls; guard only reads local files.

## Testing Strategy
- Manual: run `node scripts/delegation-guard.mjs` with and without subagent manifests to validate enforcement.
- Optional unit coverage: add a delegation-guard unit test mirroring `tests/spec-guard.spec.ts`.
- Rollback Plan: remove the guard stage from pipelines and delete the script if enforcement causes blocking issues.

## Documentation & Evidence
- Linked PRD: `docs/PRD-subagent-delegation-enforcement.md`
- Run Manifest (docs review): `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-39-51-110Z-97be9496/manifest.json`
- Metrics / State Snapshots: `.runs/0918-subagent-delegation-enforcement/metrics.json`, `out/0918-subagent-delegation-enforcement/state.json`

## Open Questions
- Should delegation guard require more than one subagent for complex tasks, or is one sufficient?

## Approvals
- Engineering: Pending
- Reviewer: Pending
