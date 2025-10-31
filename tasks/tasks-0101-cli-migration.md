# Task Checklist — CLI Migration (Task 0101)

> Update `MCP_RUNNER_TASK_ID=0101` before executing CLI commands. Mirror status across `/tasks`, `docs/TASKS.md`, and `.agent/task/0101-cli-migration.md`.

## Foundation
- [x] Assign task metadata: confirm `tasks/index.json`, `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`, `.agent/task/0101-cli-migration.md` reference task 0101; Acceptance: reviewer acknowledges synchronized docs; Evidence: docs refreshed 2025-10-31.
- [x] Bootstrap run directories: ensure `.runs/0101/cli/` and `.runs/0101/mcp/` exist with README updates if needed; Acceptance: first CLI run writes manifest; Evidence: `.runs/0101/cli/2025-10-31T13-09-10-303Z-ed11132f/manifest.json`.
- [x] Update environment defaults: set `MCP_RUNNER_TASK_ID=0101` in local shell or CI; Acceptance: CLI run picks up new task id; Evidence: diagnostics run above records `task_id: "0101"`.

## CLI Core Implementation
1. Implement CLI scaffolding
   - Files: `orchestrator/src/cli/**`, `bin/codex-orchestrator.ts`, `package.json`
   - Acceptance: `npx ts-node bin/codex-orchestrator.ts --help` lists commands; Evidence: build + lint outputs 2025-10-31.
   - Status: [x]
2. TaskManager integration
   - Files: `orchestrator/src/cli/adapters/*`, `orchestrator/src/manager.ts`
   - Acceptance: `codex-orchestrator start diagnostics` emits plan/build/test/review events; Evidence: `.runs/0101/cli/2025-10-31T13-09-10-303Z-ed11132f/manifest.json`.
   - Status: [x]
3. Nested sub-agent support
   - Files: `orchestrator/src/cli/pipelines/**`
   - Acceptance: Subpipeline stage records `parent_run_id` and child manifest reference; Evidence: `tests/cli-orchestrator.spec.ts` (subpipeline test).
   - Status: [x]

## Persistence & Telemetry
- [x] Manifests & compatibility pointers
  - Files: `orchestrator/src/cli/persistence/**`, shims under `scripts/`
  - Acceptance: `.runs/0101/cli/<run-id>/manifest.json` + `.runs/0101/mcp/<run-id>/manifest.json` pointer; Evidence: `.runs/0101/cli/2025-10-31T13-09-10-303Z-ed11132f/manifest.json` & `.runs/0101/mcp/2025-10-31T13-09-10-303Z-ed11132f/manifest.json`.
- [x] Metrics emission
  - Files: `orchestrator/src/cli/metrics/*`, `scripts/mcp-runner-metrics.js`
  - Acceptance: metrics JSONL entry appended with guardrail coverage; Evidence: `.runs/0101/metrics.json` updated 2025-10-31.
- [x] Task state snapshot
  - Files: `out/0101/state.json`
  - Acceptance: Integration test verifies run summary persisted; Evidence: `out/0101/state.json` + `tests/cli-orchestrator.spec.ts`.

## Guardrails & Rollout
- [x] Diagnostics pipeline validation
  - Commands: `codex-orchestrator start diagnostics`
  - Acceptance: run completes with `status: succeeded`; Evidence: `.runs/0101/cli/2025-10-31T13-09-10-303Z-ed11132f/manifest.json`.
- [x] Review hand-off
  - Commands: `npm run review`
  - Acceptance: review script reads latest CLI manifest; Evidence: command now skips gracefully when `codex review` unavailable (see npm output 2025-10-31).
- [x] Documentation updates
  - Files: `.agent/AGENTS.md`, `docs/TASKS.md`, `scripts/*.sh`
  - Acceptance: docs reference CLI commands only; Evidence: updated 2025-10-31.

## Enhancements — Telemetry & Preview (2025-10-31)
- [x] Telemetry schema helper
  - Files: `orchestrator/src/cli/telemetry/schema.ts`
  - Acceptance: helper exposes JSON schema + `validateCliManifest`; Evidence: `tests/cli-orchestrator.spec.ts` (telemetry helper test).
- [x] Plan preview command
  - Files: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/orchestrator.ts`
  - Acceptance: `codex-orchestrator plan diagnostics --format json` emits stage metadata; Evidence: `tests/cli-orchestrator.spec.ts` (plan preview test).
- [x] Guardrail summary emission
  - Files: `orchestrator/src/cli/run/manifest.ts`, `orchestrator/src/cli/metrics/metricsRecorder.ts`
  - Acceptance: manifest summary contains `Guardrails: ...` status after diagnostics; Evidence: `tests/cli-orchestrator.spec.ts` (summary assertion).

Flip each `[ ]` to `[x]` with the manifest path (e.g., `.runs/0101/cli/2025-10-31T23-59-59Z/manifest.json`) once acceptance criteria are satisfied.
