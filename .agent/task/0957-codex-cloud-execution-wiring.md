# Task Checklist - Codex Cloud Execution Wiring (0957)

- MCP Task ID: `0957-codex-cloud-execution-wiring`
- Primary PRD: `docs/PRD-codex-cloud-execution-wiring.md`
- TECH_SPEC: `tasks/specs/0957-codex-cloud-execution-wiring.md`
- ACTION_PLAN: `docs/ACTION_PLAN-codex-cloud-execution-wiring.md`
- Summary of scope: Route orchestrator cloud mode to real Codex Cloud execution and record cloud evidence in manifests.

> Set `MCP_RUNNER_TASK_ID=0957-codex-cloud-execution-wiring` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0957-codex-cloud-execution-wiring.md`. Flip `[ ]` to `[x]` only with evidence (manifest or log when required; standalone review approvals can cite spec/task notes).

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered - Evidence: `docs/TASKS.md`, `tasks/index.json`, `tasks/tasks-0957-codex-cloud-execution-wiring.md`, `.agent/task/0957-codex-cloud-execution-wiring.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted - Evidence: `docs/PRD-codex-cloud-execution-wiring.md`, `tasks/specs/0957-codex-cloud-execution-wiring.md`, `docs/ACTION_PLAN-codex-cloud-execution-wiring.md`, `docs/TECH_SPEC-codex-cloud-execution-wiring.md`.
- [x] Planning scout captured - Evidence: explorer subagent output in this run.
- [x] Standalone review approval captured (pre-implementation) - Evidence: `tasks/specs/0957-codex-cloud-execution-wiring.md`.
- [x] Delegation subagent run captured - Evidence: `.runs/0957-codex-cloud-execution-wiring-scout/cli/2026-02-13T09-44-14-289Z-f07a93cd/manifest.json`.

### Implementation
- [x] Add cloud-mode dispatch path to orchestrator execution wiring - Evidence: `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/adapters/CommandBuilder.ts`.
- [x] Add cloud execution adapter layer (launch/status/diff/apply) - Evidence: `orchestrator/src/cloud/CodexCloudTaskExecutor.ts`, `orchestrator/src/cli/adapters/CommandReviewer.ts`, `orchestrator/src/cli/adapters/CommandTester.ts`.
- [x] Extend manifest/task-state payloads with cloud execution metadata - Evidence: `schemas/manifest.json`, `packages/shared/manifest/types.ts`, `orchestrator/src/cli/run/manifest.ts`, `orchestrator/src/cli/services/runSummaryWriter.ts`.
- [x] Add tests for cloud path and local-mode regression coverage - Evidence: `orchestrator/tests/CodexCloudTaskExecutor.test.ts`, `orchestrator/tests/CloudModeAdapters.test.ts`, `orchestrator/tests/OrchestratorSubpipelineFailure.test.ts`.
- [x] Stabilize non-interactive review wrapper behavior (no-TTY handoff + forced timeout) - Evidence: `scripts/run-review.ts`, `docs/README.md`, `docs/standalone-review-guide.md`, `.gitignore`.

### Validation and handoff
- [x] Docs-review manifest captured - Evidence: `.runs/0957-codex-cloud-execution-wiring/cli/2026-02-13T09-47-41-178Z-453a5990/manifest.json`.
- [x] Implementation-gate review captured - Evidence: `.runs/0957-codex-cloud-execution-wiring/cli/2026-02-13T10-10-02-475Z-9fa15611/manifest.json`.

## Relevant Files
- `docs/PRD-codex-cloud-execution-wiring.md`
- `tasks/specs/0957-codex-cloud-execution-wiring.md`
- `docs/TECH_SPEC-codex-cloud-execution-wiring.md`
- `docs/ACTION_PLAN-codex-cloud-execution-wiring.md`
- `tasks/tasks-0957-codex-cloud-execution-wiring.md`
- `.agent/task/0957-codex-cloud-execution-wiring.md`
- `orchestrator/src/cli/orchestrator.ts`
- `orchestrator/src/manager.ts`
- `orchestrator/src/types.ts`
- `orchestrator/src/persistence/RunManifestWriter.ts`
- `orchestrator/src/persistence/TaskStateStore.ts`
- `orchestrator/tests/TaskManager.test.ts`
