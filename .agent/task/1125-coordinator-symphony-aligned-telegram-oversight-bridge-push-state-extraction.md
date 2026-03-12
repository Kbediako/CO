# Task Checklist - 1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction

- MCP Task ID: `1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md`
- TECH_SPEC: `tasks/specs/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md`

> This lane continues the Symphony-aligned Telegram thinning track after `1124` by extracting the bridge push-state and cooldown persistence cluster while leaving transport, presenter/controller, and mutation authority unchanged.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md`, `tasks/specs/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md`, `tasks/tasks-1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md`, `.agent/task/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md`, `out/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction/manual/20260312T005124Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1125-telegram-oversight-bridge-push-state-extraction-deliberation.md`, `out/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction/manual/20260312T005124Z-docs-first/00-summary.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction/manual/20260312T005124Z-docs-first/00-summary.md`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md`, `docs/findings/1125-telegram-oversight-bridge-push-state-extraction-deliberation.md`, `out/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction/manual/20260312T005124Z-docs-first/00-summary.md`.
- [x] docs-review attempted for registered `1125`, with the explicit override recorded when the bounded review drifted and ended interrupted instead of returning a terminal verdict. Evidence: `out/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction/manual/20260312T005124Z-docs-first/05-docs-review-override.md`, `.runs/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction/cli/2026-03-12T00-56-54-553Z-482ce21c/manifest.json`.

## Telegram Bridge Push-State / Cooldown

- [ ] `telegramOversightBridge.ts` delegates push-state and cooldown persistence into one bounded helper seam.
- [ ] The extracted seam owns persisted state defaults, last-sent/pending projection hash bookkeeping, and cooldown eligibility without moving polling transport or mutation authority out of the bridge.
- [ ] Focused Telegram regressions prove push dedupe, pending-state persistence, and cooldown behavior remain unchanged.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] `npm run review`.
- [ ] `npm run pack:smoke`.
- [ ] Manual/mock Telegram push-state evidence captured.
- [ ] Elegance review completed.
