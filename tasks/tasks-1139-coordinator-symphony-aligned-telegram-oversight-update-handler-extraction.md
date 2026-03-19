# Task Checklist - 1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction

- MCP Task ID: `1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md`
- TECH_SPEC: `tasks/specs/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md`

> This lane resumes the Symphony-aligned Telegram thinning track after `1138` by extracting the remaining update-local ingress shell while leaving poll/update lifecycle, bridge-state handling, and downstream controller ownership unchanged.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md`, `tasks/specs/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md`, `tasks/tasks-1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md`, `.agent/task/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md`, `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1139-telegram-oversight-update-handler-extraction-deliberation.md`, `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-docs-first/00-summary.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-docs-first/00-summary.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md`, `docs/findings/1139-telegram-oversight-update-handler-extraction-deliberation.md`, `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-docs-first/00-summary.md`
- [x] docs-review approval or explicit override captured for registered `1139`. Evidence: `.runs/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/cli/2026-03-12T20-45-52-814Z-c8d39681/manifest.json`, `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-docs-first/00-summary.md`

## Telegram Update Handler

- [x] `telegramOversightBridge.ts` delegates the update-local `handleUpdate` / `dispatchCommand` shell into one bounded helper seam. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/src/cli/control/controlTelegramUpdateHandler.ts`, `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/00-summary.md`
- [x] The extracted handler owns message admission, authorized-chat filtering, slash normalization, read routing, mutating fallback routing, and reply send-path invocation without moving poll/update lifecycle, `next_update_id` persistence, bot identity startup, or push-state ownership out of the bridge shell. Evidence: `orchestrator/src/cli/control/controlTelegramUpdateHandler.ts`, `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/12-manual-telegram-update-handler-check.md`
- [x] Existing `ControlTelegramReadController` and `ControlTelegramCommandController` ownership remains unchanged. Evidence: `orchestrator/src/cli/control/controlTelegramUpdateHandler.ts`, `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/12-manual-telegram-update-handler-check.md`
- [x] Focused Telegram regressions prove the update-local operator surface remains unchanged. Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/05-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/06-test.log`
- [x] `npm run docs:check` Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/07-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/08-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/09-diff-budget.log`
- [x] `npm run review` Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/10-review.log`
- [x] `npm run pack:smoke` Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/11-pack-smoke.log`
- [x] Manual/mock Telegram update-handler evidence captured. Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/12-manual-telegram-update-handler-check.md`
- [x] Elegance review completed. Evidence: `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/13-elegance-review.md`
