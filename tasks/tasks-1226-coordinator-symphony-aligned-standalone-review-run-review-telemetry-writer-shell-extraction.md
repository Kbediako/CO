# Task Checklist - 1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction

- MCP Task ID: `1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`, `tasks/specs/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`, `tasks/tasks-1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`, `.agent/task/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`
- [x] Deliberation/findings captured for the extraction lane. Evidence: `docs/findings/1226-standalone-review-run-review-telemetry-writer-shell-extraction-deliberation.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md`, `docs/findings/1226-standalone-review-run-review-telemetry-writer-shell-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T045047Z-docs-first/02-spec-guard.log`
- [x] `npm run docs:check`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T045047Z-docs-first/03-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T045047Z-docs-first/04-docs-freshness.log`
- [x] docs-review approval or explicit override captured for registered `1226`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T045047Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Telemetry-writer callback extracted from `scripts/run-review.ts` into the execution-telemetry surface without widening into the sibling `runReview` adapter. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/00-summary.md`
- [x] Focused regressions cover success/failure telemetry persistence, omitted-boundary inference, and persistence-failure logging behavior. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/05a-targeted-tests.log`

## Validation

- [x] `node scripts/delegation-guard.mjs --task 1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/04-lint.log`
- [x] Focused targeted regressions. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/05a-targeted-tests.log`
- [x] `npm run test`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/05-test.log`
- [x] `npm run docs:check`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/08-diff-budget.log`
- [x] `npm run review -- --manifest .runs/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/cli/2026-03-16T05-02-37-249Z-883ca07c/manifest.json`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/09-review.log`
- [x] `npm run pack:smoke`. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/10-pack-smoke.log`
