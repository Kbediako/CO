# Task 1179 — Coordinator Symphony-Aligned Orchestrator Local Execution Lifecycle Shell Extraction

- MCP Task ID: `1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md`

> This lane follows completed `1178`. The next bounded Symphony-aligned move is to extract the mirrored local execution lifecycle shell in `executeLocalRoute()` without reopening runtime selection, cloud fallback policy, or local executor internals.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md`, `tasks/specs/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md`, `tasks/tasks-1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md`, `.agent/task/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md`
- [x] Deliberation/findings captured for the local execution lifecycle shell seam. Evidence: `docs/findings/1179-orchestrator-local-execution-lifecycle-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md`, `docs/findings/1179-orchestrator-local-execution-lifecycle-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1179`. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/20260314T061310Z-docs-first/04-docs-review.json`, `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/20260314T061310Z-docs-first/05-docs-review-override.md`

## Local Execution Lifecycle Shell Extraction

- [ ] One bounded helper owns the local `runOrchestratorExecutionLifecycle(...)` wrapper plus router-local lifecycle callbacks. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`, `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `executeLocalRoute()` remains the router-local boundary while delegating fallback-summary shaping, auto-scout pass-through, local executor wiring, and post-finalize guardrail-summary append. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`, `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused regressions preserve fallback-summary shaping, local note propagation, and guardrail-summary append behavior without reopening runtime selection or local executor internals. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
