# Task Checklist - 1018-coordinator-symphony-aligned-observability-surface-extraction

- MCP Task ID: `1018-coordinator-symphony-aligned-observability-surface-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-observability-surface-extraction.md`
- TECH_SPEC: `tasks/specs/1018-coordinator-symphony-aligned-observability-surface-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-observability-surface-extraction.md`

> This lane extracts a Symphony-style observability presenter from `controlServer.ts` for the read-only state/issue/refresh/UI routes.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-observability-surface-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-observability-surface-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-observability-surface-extraction.md`, `tasks/specs/1018-coordinator-symphony-aligned-observability-surface-extraction.md`, `tasks/tasks-1018-coordinator-symphony-aligned-observability-surface-extraction.md`, `.agent/task/1018-coordinator-symphony-aligned-observability-surface-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1018-observability-surface-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1018-coordinator-symphony-aligned-observability-surface-extraction.md`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T101139Z-preimpl-review-and-docs-review-override/00-summary.md`.
- [x] docs-review reruns captured for registered `1018`, with an explicit review-stage override after deterministic docs gates passed on the current tree. Evidence: `.runs/1018-coordinator-symphony-aligned-observability-surface-extraction/cli/2026-03-06T09-59-37-118Z-a5ddc7a7/manifest.json`, `.runs/1018-coordinator-symphony-aligned-observability-surface-extraction/cli/2026-03-06T10-07-47-190Z-bbd3ba16/manifest.json`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T101139Z-preimpl-review-and-docs-review-override/00-summary.md`.

## Runtime Implementation
- [x] Observability-surface presenter extracted from `controlServer.ts` into a dedicated control module. Evidence: `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/00-summary.md`.
- [x] `/api/v1/state`, `/api/v1/:issue`, `/api/v1/refresh`, and `/ui/data.json` consume the shared observability surface without authority widening. Evidence: `orchestrator/src/cli/control/observabilitySurface.ts`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/09-manual-observability-check.json`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/10-manual-state.json`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/11-manual-issue.json`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/12-manual-refresh.json`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/13-manual-ui-data.json`.
- [x] `controlServer.ts` remains the thin route/auth/webhook/mutation host after extraction. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/00-summary.md`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/15-next-slice-note.md`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/08-diff-budget.log`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `.runs/1018-coordinator-symphony-aligned-observability-surface-extraction/cli/2026-03-06T10-07-47-190Z-bbd3ba16/review/output.log`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/14-pack-smoke.log`.
- [x] Manual simulated/mock usage evidence captured for observability-surface coherence. Evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/09-manual-observability-check.json`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/10-manual-state.json`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/11-manual-issue.json`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/12-manual-refresh.json`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/13-manual-ui-data.json`.
- [x] Explicit elegance review captured. Evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/12-elegance-review.md`.
- [ ] Coherent `1018` commit recorded. Evidence: pending closeout.
