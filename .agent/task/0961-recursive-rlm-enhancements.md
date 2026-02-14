# Task Checklist - Recursive RLM Enhancements (0961)

- MCP Task ID: `0961-recursive-rlm-enhancements`
- Primary PRD: `docs/PRD-recursive-rlm-enhancements.md`
- TECH_SPEC: `tasks/specs/0961-recursive-rlm-enhancements.md`
- ACTION_PLAN: `docs/ACTION_PLAN-recursive-rlm-enhancements.md`
- Summary of scope: Ship phased recursive symbolic RLM improvements with pointer-first subcall carry-forward, recursion lineage metadata, and explicit `output_var`/`final_var` handoff.

> Set `MCP_RUNNER_TASK_ID=0961-recursive-rlm-enhancements` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0961-recursive-rlm-enhancements.md`. Flip `[ ]` to `[x]` only with evidence (manifest or log when required; standalone review approvals can cite spec/task notes).

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered - Evidence: `tasks/tasks-0961-recursive-rlm-enhancements.md`, `.agent/task/0961-recursive-rlm-enhancements.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted - Evidence: `docs/PRD-recursive-rlm-enhancements.md`, `tasks/specs/0961-recursive-rlm-enhancements.md`, `docs/ACTION_PLAN-recursive-rlm-enhancements.md`, `docs/TECH_SPEC-recursive-rlm-enhancements.md`.
- [x] Planning scout captured - Evidence: `.runs/0961-recursive-rlm-enhancements-scout/cli/2026-02-14T09-35-29-030Z-6cd6fe7a/manifest.json`.
- [x] Standalone review approval captured (pre-implementation) - Evidence: `.runs/0961-recursive-rlm-enhancements/cli/2026-02-14T09-37-22-038Z-0c966eb2/manifest.json`, `tasks/specs/0961-recursive-rlm-enhancements.md`.
- [x] Delegation subagent run captured - Evidence: `.runs/0961-recursive-rlm-enhancements-scout/cli/2026-02-14T09-35-29-030Z-6cd6fe7a/manifest.json`.

### Implementation
- [x] Add symbolic subcall pointer registry (`subcall:` references) and runtime/state pointer metadata - Evidence: `orchestrator/src/cli/rlm/symbolic.ts`, `orchestrator/src/cli/rlm/types.ts`, `orchestrator/tests/RlmSymbolic.test.ts`.
- [x] Extend snippet/pointer resolution for `subcall:` references while preserving existing `ctx:` behavior - Evidence: `orchestrator/src/cli/rlm/symbolic.ts`, `orchestrator/tests/RlmSymbolic.test.ts`.
- [x] Update planner prompt carry-forward to pointer-first summaries with bounded previews - Evidence: `orchestrator/src/cli/rlm/symbolic.ts`, `orchestrator/tests/RlmSymbolic.test.ts`.
- [x] Add symbolic recursion metadata capture (`parent_pointer`) and test coverage - Evidence: `orchestrator/src/cli/rlm/symbolic.ts`, `orchestrator/src/cli/rlm/types.ts`, `orchestrator/tests/RlmSymbolic.test.ts`.
- [x] Add variable handoff contract (`subcalls[].output_var`, `intent=final.final_var`) with deterministic final resolution and retry validation - Evidence: `orchestrator/src/cli/rlm/symbolic.ts`, `orchestrator/src/cli/rlm/types.ts`, `orchestrator/tests/RlmSymbolic.test.ts`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget) - Evidence: `.runs/0961-recursive-rlm-enhancements/cli/2026-02-14T10-05-13-113Z-975d57f0/manifest.json`.
- [x] Docs-review manifest captured - Evidence: `.runs/0961-recursive-rlm-enhancements/cli/2026-02-14T10-04-42-551Z-3102e10d/manifest.json`.
- [x] Implementation-gate manifest captured - Evidence: `.runs/0961-recursive-rlm-enhancements/cli/2026-02-14T10-05-13-113Z-975d57f0/manifest.json`.
- [x] Standalone post-implementation review completed (no actionable findings) - Evidence: `out/0961-recursive-rlm-enhancements/manual/standalone-review.log`.

## Relevant Files
- `orchestrator/src/cli/rlm/symbolic.ts`
- `orchestrator/src/cli/rlm/types.ts`
- `orchestrator/src/cli/rlmRunner.ts`
- `orchestrator/tests/RlmSymbolic.test.ts`
- `docs/PRD-recursive-rlm-enhancements.md`
- `tasks/specs/0961-recursive-rlm-enhancements.md`
- `docs/ACTION_PLAN-recursive-rlm-enhancements.md`
