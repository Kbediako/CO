# Task 0105 - Recursive Language Model Orchestrator

- MCP Task ID: `0105-rlm-orchestrator`
- Primary PRD: `docs/PRD-rlm-orchestrator.md`
- Tech Spec: `docs/TECH_SPEC-rlm-orchestrator.md`
- Action Plan: `docs/ACTION_PLAN-rlm-orchestrator.md`
- Mini-spec: `tasks/specs/0105-rlm-orchestrator.md`
- Run Manifest (docs review): `.runs/0105-rlm-orchestrator/cli/2026-01-04T17-25-13-940Z-0db8bb3c/manifest.json`
- Metrics/State: `.runs/0105-rlm-orchestrator/metrics.json`, `out/0105-rlm-orchestrator/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec). Evidence: `docs/PRD-rlm-orchestrator.md`, `docs/TECH_SPEC-rlm-orchestrator.md`, `docs/ACTION_PLAN-rlm-orchestrator.md`, `tasks/tasks-0105-rlm-orchestrator.md`, `tasks/specs/0105-rlm-orchestrator.md`.
- [x] Docs-review manifest captured (pre-implementation). Evidence: `.runs/0105-rlm-orchestrator/cli/2026-01-04T17-25-13-940Z-0db8bb3c/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0105-rlm-orchestrator.md`, and `tasks/index.json`. Evidence: `docs/TASKS.md`, `tasks/tasks-0105-rlm-orchestrator.md`, `.agent/task/0105-rlm-orchestrator.md`, `tasks/index.json`.

### Implementation Planning
- [ ] CLI entrypoint + pipeline shape agreed.
- [ ] Task-id/run-id resolution agreed for ad-hoc runs.
- [ ] `rlm` vs `start <pipeline-id>` behavior agreed (blocking vs detach, run-id output).
- [ ] Built-in pipeline packaging agreed (no repo config required).
- [ ] Built-in `rlm` pipeline precedence vs local `codex.orchestrator.json` clarified (override vs disable).
- [ ] `rlm` vs `start <pipeline-id>` blocking/detach semantics + exit code retrieval documented.
- [ ] Validator auto-detect heuristics agreed.
- [ ] `--validator none` semantics + exit codes agreed.
- [ ] Loop stop conditions agreed (validator pass, max iterations, optional time cap).
- [ ] Tests/fixtures scope agreed.
