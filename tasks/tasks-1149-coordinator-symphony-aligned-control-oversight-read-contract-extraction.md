# Task Checklist - 1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction

- MCP Task ID: `1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`
- TECH_SPEC: `tasks/specs/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`

> This lane follows `1148` from the now-correct coordinator-owned read-service seam. The next bounded Symphony-aligned move is to extract the read contract itself out of Telegram ownership without reopening Telegram runtime behavior.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `tasks/specs/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `tasks/tasks-1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `.agent/task/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`
- [x] Deliberation/findings captured for the coordinator-owned oversight read-contract seam. Evidence: `docs/findings/1149-control-oversight-read-contract-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `docs/findings/1149-control-oversight-read-contract-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1149`. Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T041500Z-docs-first/00-summary.md`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T041500Z-docs-first/05-docs-review-override.md`, `.runs/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/cli/2026-03-13T04-19-14-058Z-afd63eff/manifest.json`

## Control Oversight Read Contract Extraction

- [x] One coordinator-owned oversight read contract replaces Telegram ownership of the selected-run/dispatch/question read interface. Evidence: `orchestrator/src/cli/control/controlOversightReadContract.ts`, `orchestrator/src/cli/control/telegramOversightBridge.ts`
- [x] Coordinator-owned oversight files consume the extracted contract instead of importing it from `telegramOversightBridge.ts`. Evidence: `orchestrator/src/cli/control/controlOversightFacade.ts`, `orchestrator/src/cli/control/controlOversightReadService.ts`, `orchestrator/src/cli/control/controlTelegramReadController.ts`, `orchestrator/src/cli/control/controlTelegramDispatchRead.ts`, `orchestrator/src/cli/control/controlTelegramQuestionRead.ts`
- [x] Focused coordinator and Telegram regressions preserve the existing runtime behavior. Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/01-delegation-guard.log`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/00b-delegated-guard-run.json`, `.runs/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction-guard/cli/2026-03-13T05-12-21-341Z-b079cb7f/manifest.json`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/05-test.log`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/05b-targeted-tests.log`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/13-override-notes.md`
- [x] `npm run docs:check` Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/08-diff-budget.log`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/13-override-notes.md`
- [x] `npm run review` Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/09-review.log`
- [x] `npm run pack:smoke` Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/10-pack-smoke.log`
- [x] Manual/mock oversight read-contract evidence captured. Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/11-manual-oversight-read-contract-check.json`
- [x] Elegance review completed. Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/12-elegance-review.md`
