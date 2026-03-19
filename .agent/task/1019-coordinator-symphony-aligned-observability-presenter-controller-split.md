# Task Checklist - 1019-coordinator-symphony-aligned-observability-presenter-controller-split

- MCP Task ID: `1019-coordinator-symphony-aligned-observability-presenter-controller-split`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-observability-presenter-controller-split.md`
- TECH_SPEC: `tasks/specs/1019-coordinator-symphony-aligned-observability-presenter-controller-split.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-observability-presenter-controller-split.md`

> This lane completes the Symphony-style presenter/controller split for the read-only observability routes after `1018`.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-observability-presenter-controller-split.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-observability-presenter-controller-split.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-observability-presenter-controller-split.md`, `tasks/specs/1019-coordinator-symphony-aligned-observability-presenter-controller-split.md`, `tasks/tasks-1019-coordinator-symphony-aligned-observability-presenter-controller-split.md`, `.agent/task/1019-coordinator-symphony-aligned-observability-presenter-controller-split.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1019-observability-presenter-controller-split-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `docs/findings/1019-observability-presenter-controller-split-deliberation.md`, `tasks/specs/1019-coordinator-symphony-aligned-observability-presenter-controller-split.md`.
- [x] docs-review manifest captured for registered `1019`, with an explicit review-stage override after deterministic docs gates passed on the current tree. Evidence: `.runs/1019-coordinator-symphony-aligned-observability-presenter-controller-split/cli/2026-03-06T11-12-18-543Z-89aba1d0/manifest.json`, `.runs/1019-coordinator-symphony-aligned-observability-presenter-controller-split-review-scout/cli/2026-03-06T11-11-08-597Z-c7855465/manifest.json`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T111530Z-preimpl-review-and-docs-review-override/00-summary.md`.

## Runtime Implementation
- [x] `observabilitySurface.ts` returns semantic payloads or presenter-classified outcomes instead of HTTP response objects. Evidence: `orchestrator/src/cli/control/observabilitySurface.ts`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/00-summary.md`.
- [x] `controlServer.ts` owns method/status/header/error mapping for `/api/v1/state`, `/api/v1/:issue`, `/api/v1/refresh`, and `/ui/data.json`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/00-summary.md`.
- [x] Covered read-only route behavior remains coherent and unchanged after the split. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/05-targeted-tests.log`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/11-manual-observability-check.json`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/00-summary.md`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/06-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/07-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/08-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/09-diff-budget.log`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/21-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/19-review-wrapper.log`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/21-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/10-pack-smoke.log`.
- [x] Manual simulated/mock usage evidence captured for observability route coherence. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/11-manual-observability-check.json`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/12-manual-state.json`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/13-manual-issue.json`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/14-manual-refresh.json`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/15-manual-ui-data.json`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/16-manual-method-errors-state.json`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/17-manual-method-errors-refresh.json`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/18-manual-method-errors-issue.json`.
- [x] Explicit elegance review captured. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/20-elegance-review.md`.
- [x] Coherent `1019` commit recorded. Evidence: `298376f9d` (`finish 1019 presenter controller split`).
