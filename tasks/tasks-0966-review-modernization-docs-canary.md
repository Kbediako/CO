# Task Checklist - Review Modernization + Docs Discoverability + RLM Canary (0966)

- MCP Task ID: `0966-review-modernization-docs-canary`
- Primary PRD: `docs/PRD-review-modernization-docs-canary.md`
- TECH_SPEC: `tasks/specs/0966-review-modernization-docs-canary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-review-modernization-docs-canary.md`
- Summary of scope: modernize `npm run review` scoping + artifacts + determinism, surface RLM/cloud guides, and ensure a fast RLM recursion canary exists.

> Set `MCP_RUNNER_TASK_ID=0966-review-modernization-docs-canary` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0966-review-modernization-docs-canary.md`. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0966-review-modernization-docs-canary.md`, `.agent/task/0966-review-modernization-docs-canary.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-review-modernization-docs-canary.md`, `tasks/specs/0966-review-modernization-docs-canary.md`, `docs/ACTION_PLAN-review-modernization-docs-canary.md`, `docs/TECH_SPEC-review-modernization-docs-canary.md`.
- [x] Delegation scout run captured (`<task-id>-<stream>` manifest). - Evidence: `.runs/0966-review-modernization-docs-canary-scout/cli/2026-02-16T01-27-10-928Z-717d51ec/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0966-review-modernization-docs-canary/cli/2026-02-16T01-27-49-778Z-22f94a14/manifest.json`.
- [x] Standalone pre-implementation review captured. - Evidence: `.runs/0966-review-modernization-docs-canary/cli/2026-02-16T01-27-49-778Z-22f94a14/manifest.json` (review stage prompt/handoff).

### Implementation
- [x] `npm run review` prefers real diff scoping flags (`--uncommitted/--base/--commit`) when supported and falls back when not. - Evidence: `scripts/run-review.ts`, `out/0966-review-modernization-docs-canary/manual/e2e-validation.log`.
- [x] Review artifacts persisted under the active run directory. - Evidence: `scripts/run-review.ts`, `out/0966-review-modernization-docs-canary/manual/e2e-validation.log`.
- [x] Review docs updated to match new behavior. - Evidence: `docs/standalone-review-guide.md`.
- [x] RLM + cloud guides discoverable via CLI help / README. - Evidence: `bin/codex-orchestrator.ts`, `README.md`.
- [x] RLM recursion canary test exists (pointer reads + `final_var` resolution). - Evidence: `orchestrator/tests/RlmSymbolic.test.ts`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget). - Evidence: `.runs/0966-review-modernization-docs-canary/cli/2026-02-16T02-07-10-231Z-2d46951c/manifest.json`.
- [x] Manual validation captured for review artifacts. - Evidence: `out/0966-review-modernization-docs-canary/manual/e2e-validation.log`.
- [x] Standalone post-implementation elegance review completed. - Evidence: `out/0966-review-modernization-docs-canary/manual/post-implementation-elegance-review.log`.
