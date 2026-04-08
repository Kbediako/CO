# Task Checklist - 1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse

- MCP Task ID: `1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`
- TECH_SPEC: `tasks/specs/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`

> This lane removes Telegram's in-process self-HTTP read loop after `1020`.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`, `tasks/specs/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`, `tasks/tasks-1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`, `.agent/task/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1021-telegram-in-process-read-model-reuse-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`, `docs/findings/1021-telegram-in-process-read-model-reuse-deliberation.md`.
- [x] docs-review manifest captured for registered `1021`. Evidence: `.runs/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/cli/2026-03-06T12-46-54-130Z-55b96616/manifest.json`.

## Runtime Implementation
- [x] Telegram read commands consume an injected in-process read adapter instead of self-fetching local HTTP read routes. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [x] Projection-push hashing and Telegram read rendering remain coherent after the seam change. Evidence: `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/11-manual-telegram-bridge-check.json`.
- [x] `/pause` and `/resume` remain on the existing `/control/action` transport path with unchanged bounded behavior. Evidence: `orchestrator/tests/TelegramOversightBridge.test.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/09-review-wrapper.log`, `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/10-pack-smoke.log`.
- [x] Manual simulated/mock usage evidence captured for Telegram bridge coherence. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/11-manual-telegram-bridge-check.json`.
- [x] Explicit elegance review captured. Evidence: `out/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse/manual/20260306T125623Z-closeout/12-elegance-review.md`.
- [x] Coherent `1021` commit recorded. Evidence: `f8669ccde` (`finish 1021 telegram in process read model reuse`).
