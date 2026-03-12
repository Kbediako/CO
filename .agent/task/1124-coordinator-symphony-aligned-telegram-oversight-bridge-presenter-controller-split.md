# Task Checklist - 1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split

- MCP Task ID: `1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md`
- TECH_SPEC: `tasks/specs/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md`

> This lane resumes the Symphony-aligned coordinator surface work after `1123` by splitting the Telegram oversight bridge into a thinner transport shell plus a dedicated read-side presenter/controller seam while leaving mutation authority and provider transport unchanged.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md`, `tasks/specs/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md`, `tasks/tasks-1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md`, `.agent/task/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md`, `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T001520Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1124-telegram-oversight-bridge-presenter-controller-split-deliberation.md`, `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T001520Z-docs-first/00-summary.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T001520Z-docs-first/00-summary.md`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md`, `docs/findings/1124-telegram-oversight-bridge-presenter-controller-split-deliberation.md`, `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T001520Z-docs-first/00-summary.md`.
- [x] docs-review approval captured for registered `1124`. Evidence: `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T001520Z-docs-first/00-summary.md`, `.runs/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/cli/2026-03-12T00-17-09-300Z-4df1395d/manifest.json`.

## Telegram Bridge Presenter / Controller

- [ ] `telegramOversightBridge.ts` delegates the read-side command surface into one dedicated presenter/controller seam. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/TIMESTAMP-closeout/00-summary.md`.
- [ ] The extracted seam owns `/start`, `/help`, `/status`, `/issue`, `/dispatch`, `/questions`, and projection-hash-based push shaping without moving pause/resume mutation authority out of the bridge runtime. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/TIMESTAMP-closeout/11-manual-telegram-presenter-controller-check.json`.
- [ ] Focused Telegram regressions prove integrated render behavior, push deduplication, prompt/urgency hash sensitivity, and no-selected fallback behavior remain unchanged. Evidence: `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/TIMESTAMP-closeout/05-targeted-tests.log`.

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
- [ ] Manual/mock Telegram presenter/controller evidence captured.
- [ ] Elegance review completed.
