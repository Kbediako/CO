# Task Checklist - 1023-coordinator-symphony-aligned-control-runtime-boundary-extraction

- MCP Task ID: `1023-coordinator-symphony-aligned-control-runtime-boundary-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-runtime-boundary-extraction.md`
- TECH_SPEC: `tasks/specs/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-runtime-boundary-extraction.md`

> This lane extracts the shared control runtime boundary after `1022`.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-runtime-boundary-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-runtime-boundary-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-runtime-boundary-extraction.md`, `tasks/specs/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction.md`, `tasks/tasks-1023-coordinator-symphony-aligned-control-runtime-boundary-extraction.md`, `.agent/task/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1023-control-runtime-boundary-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction.md`, `docs/findings/1023-control-runtime-boundary-extraction-deliberation.md`.
- [x] docs-review manifest captured for registered `1023` with a bounded review-wrapper override after guard stages passed. Evidence: `.runs/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/cli/2026-03-06T14-54-00-695Z-3528b753/manifest.json`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T145600Z-docs-review-override/00-summary.md`.

## Runtime Implementation
- [x] Shared runtime composition extracted from `controlServer.ts` into a dedicated internal boundary. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/controlServer.ts`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/00-summary.md`.
- [x] HTTP/UI/Telegram consumers read the shared runtime boundary instead of assembling runtime handles locally. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/controlServer.ts`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/05-targeted-tests.log`.
- [x] Compatibility refresh is wired through the runtime boundary with bounded invalidation/re-warm semantics instead of a route-local acknowledgement only. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/05-targeted-tests.log`.
- [x] State/issue/dispatch/UI/refresh behavior remains coherent after the extraction. Evidence: `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `orchestrator/tests/ObservabilityUpdateNotifier.test.ts`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/05-targeted-tests.log`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/10-manual-runtime-check.json`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/05-targeted-tests.log`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/05-test.log`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/08-diff-budget.log`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/11-review.log`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/09-pack-smoke.log`.
- [x] Manual simulated/mock usage evidence captured for shared runtime read and observability-subscription coherence. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/10-manual-runtime-check.json`.
- [x] Explicit elegance review captured. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/12-elegance-review.md`.
- [ ] Coherent `1023` commit recorded. Evidence: `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/00-summary.md`, git history for the 1023 closeout commit.
