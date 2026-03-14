# Task 1185 — Coordinator Symphony-Aligned Orchestrator Execution Mode Policy Extraction

- MCP Task ID: `1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md`
- TECH_SPEC: `tasks/specs/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md`

> This lane follows completed `1184`. The next bounded Symphony-aligned move is to extract the remaining execution-mode policy block from `orchestratorExecutionRouter.ts` without reopening route decision shell behavior, route-state assembly, or cloud/local shell internals.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md`, `tasks/specs/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md`, `tasks/tasks-1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md`, `.agent/task/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md`
- [x] Deliberation/findings captured for the execution-mode policy seam. Evidence: `docs/findings/1185-orchestrator-execution-mode-policy-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md`, `docs/findings/1185-orchestrator-execution-mode-policy-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1185`. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/20260314T094429Z-docs-first/04-docs-review.json`, `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/20260314T094429Z-docs-first/05-docs-review-override.md`

## Execution-Mode Policy Extraction

- [ ] One bounded helper/module owns `requiresCloudOrchestratorExecution(...)` and `determineOrchestratorExecutionMode(...)`. Evidence: `orchestrator/src/cli/services/`, `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `orchestratorExecutionRouter.ts` remains the thin public routing boundary and shared type-export surface. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`, `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused regressions preserve unchanged execution-mode policy semantics. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
