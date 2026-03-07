# 1038 Closeout Summary

- Task: `1038-coordinator-symphony-aligned-observability-api-controller-extraction`
- Date: `2026-03-07`
- Outcome: completed

## Delivered

- The inline `/api/v1/*` observability route tree now lives in `orchestrator/src/cli/control/observabilityApiController.ts` instead of remaining embedded inside `controlServer.ts`.
- The extracted controller now owns:
  - `/api/v1/state`,
  - `/api/v1/:issue`,
  - `/api/v1/refresh`,
  - the explicit CO-only `/api/v1/dispatch` extension,
  - reserved-segment handling, method guards, and route-local response writing.
- `controlServer.ts` now delegates `/api/v1/*` into the extracted controller while keeping `/ui/data.json`, auth/session, webhook, and mutating control surfaces on their existing seams.
- `scripts/tasks-archive.mjs` now normalizes compact inline snapshot headers before parsing and preserves a compact archive index, so `docs/TASKS.md` remains archive-safe and under the policy cap after the closeout sync. One oldest completed snapshot was archived into `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/TASKS-archive-2026.md`.

## Evidence

- Docs-first + docs-review override: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T043733Z-docs-first/00-summary.md`
- Manual controller artifact: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/11-manual-observability-controller.json`
- Archive payload: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/TASKS-archive-2026.md`
- Build/lint/test/docs/pack: `03-build.log`, `04-lint.log`, `05-test.log`, `06-docs-check.log`, `07-docs-freshness.log`, `10-pack-smoke.log`
- Diff-budget override: `08-diff-budget.log`
- Elegance pass: `12-elegance-review.md`

## Validation Disposition

- Passed:
  - `node scripts/delegation-guard.mjs --task 1038-coordinator-symphony-aligned-observability-api-controller-extraction`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs` with explicit stacked-branch override
  - `npm run pack:smoke`
- Explicit overrides:
  - `docs-review` timed out after pipeline preparation and left a stale `in_progress` manifest with no live review process.
  - `npm run review` with the same explicit stacked-branch diff-budget override reached Codex inspection, re-validated `docs/TASKS.md` via `node scripts/tasks-archive.mjs --dry-run`, and re-ran targeted `ObservabilityApiController` plus `ControlServer` Vitest coverage, but still timed out after low-signal reinspection instead of surfacing a concrete `1038` implementation defect.

## Files

- Controller / routing:
  - `orchestrator/src/cli/control/observabilityApiController.ts`
  - `orchestrator/src/cli/control/controlServer.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
- Regression coverage:
  - `orchestrator/tests/ObservabilityApiController.test.ts`
- Docs/archive hygiene:
  - `scripts/tasks-archive.mjs`
  - `docs/TASKS.md`
