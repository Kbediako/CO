# Task Checklist - 1054-coordinator-symphony-aligned-control-action-execution-extraction

- MCP Task ID: `1054-coordinator-symphony-aligned-control-action-execution-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-execution-extraction.md`
- TECH_SPEC: `tasks/specs/1054-coordinator-symphony-aligned-control-action-execution-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-execution-extraction.md`

> This lane extracts the remaining post-resolution `/control/action` execution orchestration into `controlActionExecution.ts`, including replay resolution and `updateAction(...)` coordination, while leaving transport preflight rejects, transport nonce durability, actual persistence/publish side effects, audit emission, and raw HTTP writes in `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-action-execution-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-action-execution-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-execution-extraction.md`, `tasks/specs/1054-coordinator-symphony-aligned-control-action-execution-extraction.md`, `tasks/tasks-1054-coordinator-symphony-aligned-control-action-execution-extraction.md`, `.agent/task/1054-coordinator-symphony-aligned-control-action-execution-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1054-control-action-execution-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1054-coordinator-symphony-aligned-control-action-execution-extraction.md`, `docs/findings/1054-control-action-execution-deliberation.md`.
- [x] docs-review approval/override captured for registered `1054`. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/20260307T160831Z-docs-first/05-docs-review-override.md`.

## Control Action Execution Extraction

- [ ] The remaining post-resolution `/control/action` execution logic is extracted into a dedicated helper under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/`, `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Replay resolution moves out of `controlActionPreflight.ts`, and replay matching plus `controlStore.updateAction(...)` coordination now return a typed execution result without changing contracts. Evidence: `orchestrator/src/cli/control/`, `orchestrator/src/cli/control/controlActionPreflight.ts`, `orchestrator/tests/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] `/control/action` replayed-versus-applied behavior, transport cancel replay precedence, and persist/publish decisions remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/`, `orchestrator/tests/ControlServer.test.ts`, `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/11-manual-control-action-execution.json`.
- [ ] Route ordering, fast rejects, cancel-confirmation authority, transport preflight rejection, transport nonce consume/rollback durability, actual persistence/publish side effects, audit emission, and raw HTTP writes remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/00-summary.md`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/08-diff-budget.log`, `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/09-review.log`, `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/13-override-notes.md`.
- [ ] `npm run pack:smoke` not required because no downstream-facing CLI/package/skills/review-wrapper paths changed. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/13-override-notes.md`.
- [ ] Manual mock execution artifact captured. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/11-manual-control-action-execution.json`.
- [ ] Elegance review completed. Evidence: `out/1054-coordinator-symphony-aligned-control-action-execution-extraction/manual/<pending>/12-elegance-review.md`.
