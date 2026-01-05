# Task 0105 - Recursive Language Model Orchestrator

- MCP Task ID: `0105-rlm-orchestrator`
- Primary PRD: `docs/PRD-rlm-orchestrator.md`
- Tech Spec: `docs/TECH_SPEC-rlm-orchestrator.md`
- Action Plan: `docs/ACTION_PLAN-rlm-orchestrator.md`
- Mini-spec: `tasks/specs/0105-rlm-orchestrator.md`
- Run Manifest (docs review): `.runs/0105-rlm-orchestrator/cli/2026-01-05T01-34-37-751Z-8297b912/manifest.json`
- Run Manifest (implementation gate): `.runs/0105-rlm-orchestrator/cli/2026-01-05T02-11-21-335Z-59fc8cb8/manifest.json`
- Metrics/State: `.runs/0105-rlm-orchestrator/metrics.json`, `out/0105-rlm-orchestrator/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec). Evidence: `docs/PRD-rlm-orchestrator.md`, `docs/TECH_SPEC-rlm-orchestrator.md`, `docs/ACTION_PLAN-rlm-orchestrator.md`, `tasks/tasks-0105-rlm-orchestrator.md`, `tasks/specs/0105-rlm-orchestrator.md`.
- [x] Docs-review manifest captured (pre-implementation). Evidence: `.runs/0105-rlm-orchestrator/cli/2026-01-05T01-34-37-751Z-8297b912/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0105-rlm-orchestrator.md`, and `tasks/index.json`. Evidence: `docs/TASKS.md`, `tasks/tasks-0105-rlm-orchestrator.md`, `.agent/task/0105-rlm-orchestrator.md`, `tasks/index.json`.

### Implementation Planning
- [x] CLI entrypoint + pipeline shape agreed. Evidence: `bin/codex-orchestrator.ts`, `codex.orchestrator.json`.
- [x] Task-id/run-id resolution agreed for ad-hoc runs. Evidence: `bin/codex-orchestrator.ts`.
- [x] `rlm` vs `start <pipeline-id>` behavior agreed (blocking vs detach, run-id output). Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `bin/codex-orchestrator.ts`.
- [x] Built-in pipeline packaging agreed (no repo config required). Evidence: `codex.orchestrator.json`, `orchestrator/src/cli/rlmRunner.ts`.
- [x] Built-in `rlm` pipeline precedence vs local `codex.orchestrator.json` clarified (override vs disable). Evidence: `orchestrator/src/cli/services/pipelineResolver.ts`, `orchestrator/src/cli/config/userConfig.ts`.
- [x] `rlm` vs `start <pipeline-id>` blocking/detach semantics + exit code retrieval documented. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `bin/codex-orchestrator.ts`.
- [x] Validator auto-detect heuristics agreed. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/src/cli/rlm/validator.ts`.
- [x] `--validator none` semantics + exit codes agreed. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/src/cli/rlm/runner.ts`.
- [x] Loop stop conditions agreed (validator pass, max iterations, optional time cap). Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/src/cli/rlm/runner.ts`.
- [x] Tests/fixtures scope agreed. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/tests/RlmLoop.test.ts`, `orchestrator/tests/RlmValidator.test.ts`.
