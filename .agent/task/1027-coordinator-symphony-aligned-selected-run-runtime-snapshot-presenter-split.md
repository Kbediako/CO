# Task Checklist - 1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split

- MCP Task ID: `1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md`
- TECH_SPEC: `tasks/specs/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md`

> This lane replaces the presenter-shaped selected-run runtime seam from `1026` with a transport-neutral runtime snapshot and explicit HTTP/Telegram presenter mappings.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md`, `tasks/specs/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md`, `tasks/tasks-1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md`, `.agent/task/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1027-selected-run-runtime-snapshot-presenter-split-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md`, `docs/findings/1027-selected-run-runtime-snapshot-presenter-split-deliberation.md`.
- [x] docs-review manifest captured for registered `1027`. Evidence: `.runs/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/cli/2026-03-06T19-09-31-529Z-dad3f322/manifest.json`, `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-docs-review-override/00-summary.md`.

## Delegated Review Note
- `019cc486-267d-7b21-810a-f7b8c8b5275d` approved the slice as bounded cleanup and explicitly recommended keeping compatibility wrappers if removing them would widen scope.
- `019cc486-2aff-7901-b9d0-03ad39344ca6` independently converged on the same seam: add `readSelectedRunSnapshot()`, retarget presenters, and preserve issue-alias matching, latest-event contract boundaries, and Telegram hash sensitivity.

## Runtime / Presenter Split
- [x] `ControlRuntime` exposes a transport-neutral selected-run runtime snapshot for internal consumers. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`.
- [x] Compatibility `/state` and `/issue` shaping present the runtime snapshot rather than owning the runtime seam shape. Evidence: `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] Telegram status/issue/fingerprint shaping present the runtime snapshot rather than consuming public DTOs as runtime state. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`.
- [x] Dead helper/runtime surface from `1026` is removed or reduced where the presenter split makes it unnecessary. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/controlServer.ts`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/05-targeted-tests.log`, `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/05-test.log`, `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/08-diff-budget.log`, `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/09-review.log`, `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/10-pack-smoke.log`.
- [x] Manual simulated/mock presenter-alignment evidence captured. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/11-manual-presenter-alignment.json`.
- [x] Explicit elegance review captured. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/12-elegance-review.md`.
- [ ] Coherent `1027` commit recorded. Evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/<pending>/00-summary.md`, git history for commit `<pending>`.
