# Task Checklist - 1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe

- MCP Task ID: `1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe.md`
- TECH_SPEC: `tasks/specs/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe.md`

> This lane extracts a canonical shared snapshot/read model for HTTP/UI/Telegram after `1024`, with one intentional Telegram push-dedupe correction.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe.md`, `tasks/specs/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe.md`, `tasks/tasks-1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe.md`, `.agent/task/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1025-shared-observability-read-model-and-telegram-projection-dedupe-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe.md`, `docs/findings/1025-shared-observability-read-model-and-telegram-projection-dedupe-deliberation.md`.
- [ ] docs-review manifest captured for registered `1025`. Evidence: `.runs/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/cli/<pending>/manifest.json`.

## Runtime Implementation
- [ ] Shared internal observability read-model module implemented and adopted by HTTP/UI/Telegram snapshot consumers. Evidence: `orchestrator/src/cli/control/<pending>`, `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/`.
- [ ] Duplicate tracked Linear snapshot payload shaping removed from selected-run and observability layers. Evidence: `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`.
- [ ] HTTP/UI payload builders consume shared selected-run/question/tracked summary builders instead of reassembling overlapping fields independently. Evidence: `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/src/cli/control/controlRuntime.ts`.
- [ ] Telegram renderers and projection hashing consume the shared read model, including prompt/urgency-aware queued-question fingerprinting. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`.
- [ ] Dispatch route behavior remains unchanged apart from using shared summary typing where appropriate. Evidence: `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout
- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/09-review.log`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/10-pack-smoke.log`.
- [ ] Manual simulated/mock usage evidence captured for shared read-model parity and Telegram projection dedupe. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/11-manual-observability-parity.json`, `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/12-manual-telegram-question-hash.json`.
- [ ] Explicit elegance review captured. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/13-elegance-review.md`.
- [ ] Coherent `1025` commit recorded. Evidence: `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/<pending>/00-summary.md`, git history for commit `<pending>`.
