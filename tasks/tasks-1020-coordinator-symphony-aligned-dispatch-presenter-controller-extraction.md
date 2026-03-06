# Task Checklist - 1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction

- MCP Task ID: `1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`

> This lane extracts the remaining read-only `/api/v1/dispatch` seam after `1019`.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`, `tasks/specs/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`, `tasks/tasks-1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`, `.agent/task/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1020-dispatch-presenter-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/13-delegated-review-notes.md`.
- [x] docs-review manifest captured for registered `1020`. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/01-docs-review-manifest.json`.

## Runtime Implementation
- [x] Dispatch presenter/read-side code shapes payloads and semantic outcomes instead of the inline `/api/v1/dispatch` route body doing everything. Evidence: `orchestrator/src/cli/control/observabilitySurface.ts`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/00-summary.md`.
- [x] `controlServer.ts` keeps method/status/header/audit ownership for `/api/v1/dispatch` while staying thinner than the post-1019 baseline. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/00-summary.md`.
- [x] Dispatch public behavior remains coherent and unchanged after the split. Evidence: `orchestrator/tests/ControlServer.test.ts`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/09-manual-dispatch-check.json`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/02-implementation-gate-manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/02-implementation-gate-manifest.json`.
- [x] `npm run build`. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/02-implementation-gate-manifest.json`.
- [x] `npm run lint`. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/02-implementation-gate-manifest.json`.
- [x] `npm run test`. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/02-implementation-gate-manifest.json`.
- [x] `npm run docs:check`. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/02-implementation-gate-manifest.json`.
- [x] `npm run docs:freshness`. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/02-implementation-gate-manifest.json`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/04-diff-budget-override.log`.
- [x] `npm run review`. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/06-review-wrapper.log`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/11-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/05-pack-smoke.log`.
- [x] Manual simulated/mock usage evidence captured for dispatch coherence. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/09-manual-dispatch-check.json`.
- [x] Explicit elegance review captured. Evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/10-elegance-review.md`.
- [ ] Coherent `1020` commit recorded. Evidence: pending closeout.
