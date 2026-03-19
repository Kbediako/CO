# Task Checklist - 1055-coordinator-symphony-aligned-control-action-finalization-extraction

- MCP Task ID: `1055-coordinator-symphony-aligned-control-action-finalization-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-finalization-extraction.md`
- TECH_SPEC: `tasks/specs/1055-coordinator-symphony-aligned-control-action-finalization-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-finalization-extraction.md`

> This lane extracts the remaining `/control/action` finalization seam into `controlActionFinalization.ts`, centralizing replay/applied response and audit payload shaping while leaving confirmation authority, nonce durability, actual persistence/publish side effects, and raw HTTP writes in `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-action-finalization-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-action-finalization-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-finalization-extraction.md`, `tasks/specs/1055-coordinator-symphony-aligned-control-action-finalization-extraction.md`, `tasks/tasks-1055-coordinator-symphony-aligned-control-action-finalization-extraction.md`, `.agent/task/1055-coordinator-symphony-aligned-control-action-finalization-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1055-control-action-finalization-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1055-coordinator-symphony-aligned-control-action-finalization-extraction.md`, `docs/findings/1055-control-action-finalization-deliberation.md`.
- [x] docs-review approval/override captured for registered `1055`. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T005652Z-docs-first/05-docs-review-override.md`.

## Control Action Finalization Extraction

- [x] Replay/applied response and audit payload planning is extracted into a dedicated helper under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/controlActionFinalization.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [x] Pre-confirm replay handling and post-execution finalization share the extracted finalization helper without changing contracts. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlActionFinalization.test.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] `controlServer.ts` still owns confirmation authority, transport nonce consume/rollback durability, actual persistence/publish side effects, audit emission, and raw HTTP writes. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/11-manual-control-action-finalization.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/01-delegation-guard.log`, `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/13-override-notes.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/05-test.log`, `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/05c-vitest.json`, `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/08-diff-budget.log`, `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/09-review.log`, `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` not required because no downstream-facing CLI/package/skills/review-wrapper paths changed. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/13-override-notes.md`.
- [x] Manual mock finalization artifact captured. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/11-manual-control-action-finalization.json`.
- [x] Elegance review completed. Evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T011304Z-closeout/12-elegance-review.md`.
