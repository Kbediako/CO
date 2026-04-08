# Task Checklist - 1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context

- MCP Task ID: `1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`
- TECH_SPEC: `tasks/specs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`

> This lane tightens the Symphony-aligned oversight experience by centralizing selected-run projection instead of adding more transport surface area.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`, `tasks/specs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`, `tasks/tasks-1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`, `.agent/task/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1015-selected-run-projection-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`, `docs/findings/1015-selected-run-projection-deliberation.md`, `.runs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context-scout/cli/2026-03-06T05-36-09-835Z-294c48ca/manifest.json`.
- [x] docs-review manifest captured for registered `1015`. Evidence: `.runs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/cli/2026-03-06T05-39-45-281Z-cc078dc0/manifest.json`, `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/13-override-notes.md`.

## Runtime Implementation
- [x] Shared selected-run context builder implemented and adopted by `/api/v1/state`, `/api/v1/:issue`, and `/ui/data.json`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/05-targeted-tests.log`.
- [x] Telegram `/status` and `/issue` render from the shared selected-run context. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/05-targeted-tests.log`.
- [x] Live Linear advisory refresh remains bounded, request-scoped, and fail closed while feeding the shared context. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/05-targeted-tests.log`, `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/11-live-linear-verification.md`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/05-targeted-tests.log`, `.runs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/cli/2026-03-06T06-05-38-377Z-5c18874a/commands/05-test.ndjson`, `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `.runs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/cli/2026-03-06T06-05-38-377Z-5c18874a/review/output.log`, `.runs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/cli/2026-03-06T06-05-38-377Z-5c18874a/review/telemetry.json`, `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/09-pack-smoke.log`.
- [x] Manual simulated/mock usage evidence captured for state/UI/Telegram/Linear coherence. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/10-manual-selected-run-mock.json`.
- [x] Live Linear provider verification captured with the real binding. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/11-live-linear-verification.md`.
- [x] Explicit elegance review captured. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/12-elegance-review.md`.
- [x] Coherent 1015 commit recorded. Evidence: `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/00-summary.md`, git history for the 1015 closeout commit.
