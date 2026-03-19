# Task Checklist - 1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction

- MCP Task ID: `1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`
- TECH_SPEC: `tasks/specs/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`

> This lane extracts a single review execution state/monitor owner from `scripts/run-review.ts` so standalone review reliability becomes structurally closer to the real Symphony pattern of one state owner plus thin controller/projection layers.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `tasks/specs/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `tasks/tasks-1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `.agent/task/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1058-standalone-review-execution-state-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`, `docs/findings/1058-standalone-review-execution-state-deliberation.md`.
- [x] docs-review approval/override captured for registered `1058`. Evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031500Z-docs-first/05-docs-review-override.md`.

## Standalone Review Execution State Extraction

- [x] A dedicated review execution state/monitor module is extracted adjacent to `scripts/run-review.ts`. Evidence: `scripts/lib/review-execution-state.ts`, `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/00-summary.md`.
- [x] `scripts/run-review.ts` becomes a thinner shell over prompt/runtime/launch orchestration. Evidence: `scripts/run-review.ts`, `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/00-summary.md`.
- [x] Telemetry persistence, checkpoint logging, and failure summaries are driven from the shared runtime snapshot. Evidence: `scripts/lib/review-execution-state.ts`, `tests/run-review.spec.ts`, `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/11-manual-review-runtime-check.md`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `.runs/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction-review-scout/cli/2026-03-08T03-09-16-958Z-82825536/manifest.json`, `.runs/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction-review-scout/cli/2026-03-08T03-09-16-958Z-82825536/commands/04-test.ndjson`, `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/05-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/08-diff-budget.log`, `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `.runs/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/cli/2026-03-08T03-10-22-083Z-b9607d37/commands/05-review.ndjson`, `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/11-manual-review-runtime-check.md`, `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/09-pack-smoke.log`.
- [x] Manual review-wrapper/runtime artifact captured. Evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/11-manual-review-runtime-check.md`.
- [x] Elegance review completed. Evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/12-elegance-review.md`.
