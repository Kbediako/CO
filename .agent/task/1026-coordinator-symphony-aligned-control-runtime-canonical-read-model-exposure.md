# Task Checklist - 1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure

- MCP Task ID: `1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md`
- TECH_SPEC: `tasks/specs/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md`

> This lane exposes the canonical selected-run/read-model seam directly from `ControlRuntime` after `1025` and moves Telegram read-side rendering onto it.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md`, `tasks/specs/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md`, `tasks/tasks-1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md`, `.agent/task/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1026-control-runtime-canonical-read-model-exposure-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md`, `docs/findings/1026-control-runtime-canonical-read-model-exposure-deliberation.md`.
- [x] docs-review manifest captured for registered `1026`. Evidence: `.runs/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/cli/2026-03-06T18-08-53-172Z-94291389/manifest.json`, `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/20260306T181532Z-docs-review-override/00-summary.md`.

## Runtime Implementation
- [ ] `ControlRuntime` exposes a canonical selected-run/read model directly for internal consumers. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`.
- [ ] Telegram read-side status/issue rendering consumes the canonical runtime model instead of compatibility `state`/`issue` envelopes. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Telegram projection-push hashing consumes the canonical runtime model while keeping visible status semantics coherent. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`.
- [ ] Compatibility HTTP state/issue/dispatch/refresh behavior remains unchanged. Evidence: `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout
- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/09-review.log`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/10-pack-smoke.log`.
- [ ] Manual simulated/mock Telegram status/issue evidence captured for the canonical runtime seam. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/11-manual-telegram-runtime-read-model.json`.
- [ ] Explicit elegance review captured. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/12-elegance-review.md`.
- [ ] Coherent `1026` commit recorded. Evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/<pending>/00-summary.md`, git history for commit `<pending>`.
