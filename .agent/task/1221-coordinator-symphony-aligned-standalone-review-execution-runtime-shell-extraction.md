# Task Checklist - 1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction

- MCP Task ID: `1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`, `tasks/specs/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`, `tasks/tasks-1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`, `.agent/task/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`
- [x] Deliberation/findings captured for the extraction lane. Evidence: `docs/findings/1221-standalone-review-execution-runtime-shell-extraction-deliberation.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md`, `docs/findings/1221-standalone-review-execution-runtime-shell-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] docs-review approval or explicit override captured for registered `1221`. Evidence: `out/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction/manual/20260315T213403Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Child execution and termination-monitor shell extracted behind a dedicated runtime helper/module. Evidence: `scripts/run-review.ts`, `out/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction/manual/20260315T213403Z-closeout/00-summary.md`
- [ ] `main()` remains the orchestration owner for prompt/runtime/handoff and telemetry write/retry behavior. Evidence: `scripts/run-review.ts`, `out/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction/manual/20260315T213403Z-closeout/00-summary.md`
- [ ] Focused regressions cover the extracted runtime boundary. Evidence: `out/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction/manual/20260315T213403Z-closeout/05a-targeted-tests.log`

## Validation

- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction/manual/20260315T213403Z-docs-first/02-spec-guard.log`
- [x] `npm run docs:check`. Evidence: `out/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction/manual/20260315T213403Z-docs-first/03-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction/manual/20260315T213403Z-docs-first/04-docs-freshness.log`
