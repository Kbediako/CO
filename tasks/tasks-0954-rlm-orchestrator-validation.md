# Task Checklist - RLM Orchestrator Validation (0954)

- MCP Task ID: `0954-rlm-orchestrator-validation`
- Primary PRD: `docs/PRD-rlm-orchestrator-validation.md`
- TECH_SPEC: `tasks/specs/0954-rlm-orchestrator-validation.md`
- ACTION_PLAN: `docs/ACTION_PLAN-rlm-orchestrator-validation.md`
- Summary of scope: Define deterministic RLM test matrix (unit/integration/eval) and fixtures for correctness, determinism, and scalability.

> Set `MCP_RUNNER_TASK_ID=0954-rlm-orchestrator-validation` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run eval:test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0954-rlm-orchestrator-validation.md`. Flip `[ ]` to `[x]` only with evidence (manifest or log when required; standalone review approvals can cite spec/task notes).

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered — Evidence: `docs/TASKS.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `tasks/tasks-0954-rlm-orchestrator-validation.md`, `.agent/task/0954-rlm-orchestrator-validation.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted — Evidence: `docs/PRD-rlm-orchestrator-validation.md`, `tasks/specs/0954-rlm-orchestrator-validation.md`, `docs/ACTION_PLAN-rlm-orchestrator-validation.md`, `docs/TECH_SPEC-rlm-orchestrator-validation.md`.
- [x] Delegation subagent run captured — Evidence: `.runs/0954-rlm-orchestrator-validation-scout/cli/2026-01-20T00-15-43-550Z-d2e1a386/manifest.json`, `.runs/0954-rlm-orchestrator-validation-oolong-scout/cli/2026-01-20T02-52-46-525Z-33cc5f9b/manifest.json`.
- [x] Standalone review approval captured (pre-implementation) — Evidence: `tasks/specs/0954-rlm-orchestrator-validation.md`.

### Implementation
- [x] RLM context-scale fixture + benchmark script added — Evidence: `evaluation/fixtures/rlm-context-scale/fixture.json`, `evaluation/benchmarks/rlm-context-scale.mjs`, `evaluation/scenarios/rlm-context-scale.json`.
- [x] Eval harness coverage added — Evidence: `evaluation/tests/harness.test.ts`.
- [x] OOLONG fixture + benchmark scripts added — Evidence: `evaluation/fixtures/rlm-oolong/fixture.json`, `evaluation/fixtures/rlm-oolong/sample.json`, `evaluation/fixtures/rlm-oolong/README.md`, `evaluation/benchmarks/rlm-oolong.mjs`, `evaluation/scenarios/rlm-oolong.json`.
- [x] OOLONG-Pairs fixture + benchmark scripts added — Evidence: `evaluation/fixtures/rlm-oolong-pairs/fixture.json`, `evaluation/fixtures/rlm-oolong-pairs/sample.json`, `evaluation/fixtures/rlm-oolong-pairs/README.md`, `evaluation/benchmarks/rlm-oolong-pairs.mjs`, `evaluation/scenarios/rlm-oolong-pairs.json`.
- [x] Eval harness coverage for OOLONG scenarios — Evidence: `evaluation/tests/harness.test.ts`.
- [x] OOLONG fallback + repeatability support — Evidence: `evaluation/benchmarks/oolong-shared.mjs`, `evaluation/benchmarks/rlm-oolong.mjs`, `evaluation/benchmarks/rlm-oolong-pairs.mjs`, `evaluation/fixtures/rlm-oolong/fixture.json`, `evaluation/fixtures/rlm-oolong-pairs/fixture.json`.

### Validation + handoff
- [x] Docs-review manifest captured — Evidence: `.runs/0954-rlm-orchestrator-validation/cli/2026-01-20T00-30-29-792Z-9e030d6d/manifest.json`.
- [x] Guardrail evidence captured (eval:test + diff-budget) — Evidence: `out/0954-rlm-orchestrator-validation/guardrails/eval-test.log`, `out/0954-rlm-orchestrator-validation/guardrails/diff-budget.log`.

## Relevant Files
- `tasks/specs/0954-rlm-orchestrator-validation.md`
