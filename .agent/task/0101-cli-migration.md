# Task List — Orchestrator Wrapper Template

## Context
- Link to PRD: `docs/PRD.md`
- Summary: Maintain a Codex orchestrator wrapper that supports multiple downstream projects, each with its own task id, manifests, and guardrail evidence.

### Checklist Convention
- Keep `[ ]` until acceptance criteria is met. Flip to `[x]` and attach the manifest path from `.runs/<task-id>/cli/<run-id>/manifest.json` that proves completion.

## Parent Tasks
1. **Foundation**
   - Subtask: Synchronize docs & checklists
     - Files: `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`, `/tasks/<task-id>-<slug>.md`
     - Acceptance: Reviewer confirms documentation mirrors the active project with manifest placeholders; Evidence: manifest link added to each checklist entry.
     - [ ] Status: Pending
   - Subtask: Prepare run directories & env
     - Files: `.runs/<task-id>/**`, `.runs/local-mcp/**`
     - Commands: `mkdir -p .runs/<task-id>/cli`, export `MCP_RUNNER_TASK_ID=<task-id>`
     - Acceptance: First diagnostics run writes `.runs/<task-id>/cli/<run-id>/manifest.json`; Evidence: attach manifest path.
     - [ ] Status: Pending
2. **Project Pipelines**
   - Subtask: Configure orchestrator scaffolding
     - Files: `packages/<project>/**`, `orchestrator/src/cli/pipelines/**`
     - Acceptance: `codex-orchestrator start diagnostics --format json` succeeds for the project; Evidence: diagnostics manifest path + metrics file.
     - [ ] Status: Pending
   - Subtask: Nested run lineage
     - Files: `orchestrator/src/cli/pipelines/**`
     - Acceptance: Child manifest references `parent_run_id` (verified via manifest snippet or test log); Evidence: manifest + test output.
     - [ ] Status: Pending
3. **Persistence & Telemetry**
   - Subtask: Manifest & compatibility pointers
     - Files: `orchestrator/src/cli/persistence/**`, `scripts/agents_mcp_runner.mjs`
     - Acceptance: `.runs/<task-id>/mcp/<run-id>/manifest.json` points to CLI artifact; Evidence: compatibility manifest path.
     - [ ] Status: Pending
   - Subtask: Metrics + snapshots
     - Files: `orchestrator/src/cli/metrics/**`, `out/<task-id>/state.json`
     - Acceptance: `.runs/<task-id>/metrics.json` updated with latest run and `out/<task-id>/state.json` written; Evidence: manifest summary referencing metrics file.
     - [ ] Status: Pending
4. **Guardrails & Rollout**
   - Subtask: Diagnostics pipeline validation
     - Commands: `codex-orchestrator start diagnostics`
     - Acceptance: Manifest `status: succeeded` and guardrail summary recorded; Evidence: `.runs/<task-id>/cli/<run-id>/manifest.json#summary`.
     - [ ] Status: Pending
   - Subtask: Documentation + shims
     - Files: `.agent/AGENTS.md`, `docs/TASKS.md`, `scripts/*.sh`
     - Acceptance: Docs explain multi-project layout and reference manifest paths; Evidence: updated doc links.
     - [ ] Status: Pending
5. **Reviewer Hand-off**
   - Subtask: Review workflow alignment
     - Commands: `npm run review` (or project command)
     - Acceptance: Review instructions pull latest manifest under `.runs/<task-id>/cli/`; Evidence: command output + manifest path.
     - [ ] Status: Pending

## Relevant Files
- `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`, `/tasks/<task-id>-<slug>.md`, `/tasks/tasks-<task-id>-<slug>.md`

## Notes
- Spec Requirements: keep `tasks/specs` synchronized with manifest links as new projects onboard.
- Approvals: Log all escalations inside manifests under `approvals` and reference those entries in checklist updates when present.
- Links: Replace placeholders with concrete run ids before requesting review.
