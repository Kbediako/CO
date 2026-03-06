# Task Checklist - 1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh

- MCP Task ID: `1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`
- TECH_SPEC: `tasks/specs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`

> This lane extracts the selected-run projection boundary out of `controlServer.ts` and keeps live Linear evaluation inside that shared read-side layer.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`, `tasks/specs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`, `tasks/tasks-1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`, `.agent/task/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1017-projection-boundary-and-live-linear-refresh-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`, `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh-scout/cli/2026-03-06T09-07-59-008Z-3b54bc1a/manifest.json`.
- [x] docs-review manifest captured for registered `1017`. Evidence: `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/2026-03-06T09-16-58-040Z-fb4db1e5/manifest.json`, `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T091813Z-docs-review-override/00-summary.md`.

## Runtime Implementation
- [x] Selected-run projection boundary extracted from `controlServer.ts` into a dedicated control module. Evidence: `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/controlServer.ts`, `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/00-summary.md`.
- [x] Async live Linear evaluation remains owned by the extracted boundary without authority widening. Evidence: `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/10-manual-projection-mock.json`.
- [x] `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and dispatch read-path coherence preserved through the extracted boundary. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/10-manual-projection-mock.json`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/08-diff-budget.log`, `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/2026-03-06T09-16-58-040Z-fb4db1e5/review/output.log`, `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/2026-03-06T09-16-58-040Z-fb4db1e5/review/telemetry.json`, `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/09-pack-smoke.log`.
- [x] Manual simulated/mock usage evidence captured for projection/read-surface coherence. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/10-manual-projection-mock.json`.
- [x] Explicit elegance review captured. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/11-elegance-review.md`.
- [ ] Coherent `1017` commit recorded. Evidence: pending closeout.
