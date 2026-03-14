# Task 1176 — Coordinator Symphony-Aligned Orchestrator Cloud-Target Completion Shell Extraction

- MCP Task ID: `1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md`

> This lane follows completed `1175`. The next bounded Symphony-aligned move is to extract the post-executor completion shell in `orchestratorCloudTargetExecutor.ts` without reopening resolution, missing-env handling, request shaping, or the already-extracted running/update shell.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md`, `tasks/specs/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md`, `tasks/tasks-1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md`, `.agent/task/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md`
- [x] Deliberation/findings captured for the completion shell seam. Evidence: `docs/findings/1176-orchestrator-cloud-target-completion-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md`, `docs/findings/1176-orchestrator-cloud-target-completion-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1176`. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/20260314T050129Z-docs-first/05-docs-review-override.md`

## Completion Shell Extraction

- [ ] One bounded helper inside `orchestratorCloudTargetExecutor.ts` owns the post-executor completion shell. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `executeOrchestratorCloudTarget(...)` retains resolution, missing-env handling, request shaping, executor invocation, and return-path control flow. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused cloud regressions preserve success/failure completion behavior without widening into the broader executor lifecycle. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
