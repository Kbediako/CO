# Task Checklist - linear-a87ae732-0cf0-475e-b7af-a2dec20933e1

- Linear Issue: `CO-93` / `a87ae732-0cf0-475e-b7af-a2dec20933e1`
- MCP Task ID: `linear-a87ae732-0cf0-475e-b7af-a2dec20933e1`
- Primary PRD: `docs/PRD-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`
- Task spec: `tasks/specs/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the initial workpad source were drafted or refreshed for `CO-93`. Evidence: `docs/PRD-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`, `docs/TECH_SPEC-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`, `docs/ACTION_PLAN-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`, `tasks/specs/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`, `tasks/tasks-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`, `.agent/task/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`.
- [x] Docs-review delegation evidence is captured and any repo-wide stale-doc baseline is recorded truthfully rather than as a packet-shape blocker. Evidence: `.runs/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1-co-93-docs-review/cli/2026-04-09T08-43-30-222Z-2e139d0f/manifest.json`, `.runs/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1-co-93-docs-review-rerun/cli/2026-04-09T08-45-44-860Z-1bacbce2/manifest.json`, `out/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1/manual/20260409T084843Z-docs-review-fallback.md`.

## Implementation
- [x] One additive block-memory artifact is emitted from the lifecycle persistence seam. Evidence: `orchestrator/src/cli/run/blockMemory.ts`, `orchestrator/src/cli/services/runSummaryWriter.ts`, `schemas/manifest.json`, `packages/shared/manifest/types.ts`.
- [x] Block entries are pointer-based and traceable to existing drill-down artifacts. Evidence: `orchestrator/src/cli/run/blockMemory.ts`, `orchestrator/tests/OrchestratorRunLifecycleCompletion.test.ts`.
- [x] At least one consumer reads the emitted artifact. Evidence: `scripts/lib/review-prompt-context.ts`, `tests/review-prompt-context.spec.ts`.
- [x] Lifecycle tests cover write/finalize behavior. Evidence: `orchestrator/tests/OrchestratorRunLifecycleCompletion.test.ts`, `tests/review-prompt-context.spec.ts`.

## Validation
- [x] Focused tests cover lifecycle emission and consumer reads. Evidence: `npm run test:orchestrator -- orchestrator/tests/OrchestratorRunLifecycleCompletion.test.ts tests/review-prompt-context.spec.ts`.
- [x] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `TASK=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 NOTES="Goal: review gate rerun | Summary: CO-93 block-memory slice plus post-review path-validation fixes | Risks: provider-worker root mismatch may still launch the wrapper from the shared root instead of the issue worktree" FORCE_CODEX_REVIEW=1 npm run review -- --manifest /Users/kbediako/Code/CO/.runs/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1/cli/2026-04-13T02-26-01-632Z-bdba5c86/manifest.json`, and `npm run pack:smoke` were rerun or truthfully recorded with bounded fallback notes. Evidence: workpad note `out/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1/manual/workpad.md`, review output `.runs/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1/cli/2026-04-13T02-26-01-632Z-bdba5c86/review/output.log`.
- [x] Workpad and closeout artifacts record the emitted block-memory contract, consumer proof, and review fallback status. Evidence: `out/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1/manual/workpad.md`, Linear workpad comment `2da23159-065c-4749-9b47-3a1ab84a3d75`.

## Handoff
- [x] The issue is in `In Progress`, and exactly one persistent `## Codex Workpad` comment is maintained for the issue. Evidence: Linear workpad comment `2da23159-065c-4749-9b47-3a1ab84a3d75`, `out/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1/manual/workpad.md`.
- [ ] A PR is attached before any review-state handoff. Evidence: pending.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
