# Task List — CLI Migration (Task 0101)

## Context
- Link to PRD: `docs/PRD.md`
- Summary: Replace MCP runner with Codex Orchestrator CLI while preserving manifests, metrics, and nested run lineage.

### Checklist Convention
- Keep `[ ]` until acceptance criteria met; flip to `[x]` with manifest or log path.

## Parent Tasks
1. **Foundation**
   - Subtask: Synchronize docs & checklists
     - Files: `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`, `/tasks/0101-prd-cli-migration.md`
     - Acceptance: Reviewer confirms task 0101 mirrored across docs; Evidence: docs refreshed 2025-10-31
     - [x] Status: Complete
   - Subtask: Prepare run directories & env
     - Files: `.runs/0101/**`, `.runs/local-mcp/**`
     - Commands: `mkdir -p .runs/0101/cli`, export `MCP_RUNNER_TASK_ID=0101`
     - Acceptance: first CLI run emits manifest under `.runs/0101/cli`; Evidence: `.runs/0101/cli/2025-10-31T13-09-10-303Z-ed11132f/manifest.json`
     - [x] Status: Complete
2. **CLI Core**
   - Subtask: Implement CLI scaffolding
     - Files: `orchestrator/src/cli/**`, `bin/codex-orchestrator.ts`
     - Commands: `npm run build`
     - Acceptance: `codex-orchestrator --help` lists commands; Evidence: lint/build logs 2025-10-31
     - [x] Status: Complete
   - Subtask: TaskManager integration
     - Files: `orchestrator/src/cli/adapters/*`
     - Acceptance: Plan/build/test/review events emitted during run; Evidence: `.runs/0101/cli/2025-10-31T13-09-10-303Z-ed11132f/manifest.json`
     - [x] Status: Complete
   - Subtask: Nested sub-agent support
     - Files: `orchestrator/src/cli/pipelines/**`
     - Acceptance: Child run manifest references parent run id; Evidence: `tests/cli-orchestrator.spec.ts`
     - [x] Status: Complete
3. **Persistence & Telemetry**
   - Subtask: Manifest & compatibility pointers
     - Files: `orchestrator/src/cli/persistence/**`, `scripts/agents_mcp_runner.mjs`
     - Acceptance: `.runs/0101/mcp/<run-id>/manifest.json` points to CLI artifact; Evidence: `.runs/0101/mcp/2025-10-31T13-09-10-303Z-ed11132f/manifest.json`
     - [x] Status: Complete
   - Subtask: Metrics + snapshots
     - Files: `orchestrator/src/cli/metrics/**`, `out/0101/state.json`
     - Acceptance: Metrics JSONL appended and task state snapshot updated; Evidence: `.runs/0101/metrics.json`, `out/0101/state.json`
     - [x] Status: Complete
4. **Guardrails & Rollout**
   - Subtask: Diagnostics pipeline validation
     - Commands: `codex-orchestrator start diagnostics`
     - Acceptance: Manifest `status: succeeded`; Evidence: `.runs/0101/cli/2025-10-31T13-09-10-303Z-ed11132f/manifest.json`
     - [x] Status: Complete
   - Subtask: Documentation + shims
     - Files: `.agent/AGENTS.md`, `docs/TASKS.md`, `scripts/*.sh`
     - Acceptance: MCP references replaced with CLI instructions; Evidence: updated 2025-10-31
     - [x] Status: Complete
5. **Reviewer Hand-off**
   - Subtask: `npm run review` alignment
     - Commands: `npm run review`
     - Acceptance: review script reads latest CLI manifest or skips when unsupported; Evidence: npm run review output 2025-10-31
     - [x] Status: Complete

6. **Enhancements — Telemetry & Preview (2025-10-31)**
   - Subtask: Telemetry schema helper
     - Files: `orchestrator/src/cli/telemetry/schema.ts`
     - Acceptance: helper exposes JSON schema + validator; Evidence: `tests/cli-orchestrator.spec.ts`
     - [x] Status: Complete
   - Subtask: Plan preview command
     - Files: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/orchestrator.ts`
     - Acceptance: `codex-orchestrator plan` prints stages (text/JSON); Evidence: `tests/cli-orchestrator.spec.ts`
     - [x] Status: Complete
   - Subtask: Guardrail summary emission
     - Files: `orchestrator/src/cli/run/manifest.ts`, `orchestrator/src/cli/metrics/metricsRecorder.ts`
     - Acceptance: manifest summary ends with `Guardrails:` entry; Evidence: `tests/cli-orchestrator.spec.ts`
     - [x] Status: Complete

## Relevant Files
- `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`, `/tasks/0101-prd-cli-migration.md`, `/tasks/tasks-0101-cli-migration.md`

## Notes
- Spec Requirements: maintain updates under `tasks/specs` as CLI evolves.
- Approvals Needed: none (approval policy `never` for this environment).
- Links: pending manifest references once runs execute.
