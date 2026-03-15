# Task Checklist - 1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction

- MCP Task ID: `1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- TECH_SPEC: `tasks/specs/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `tasks/specs/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `tasks/tasks-1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `.agent/task/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- [x] Deliberation/findings captured for the extraction lane. Evidence: `docs/findings/1209-standalone-review-shell-env-interpreter-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `docs/findings/1209-standalone-review-shell-env-interpreter-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1209`. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T033505Z-docs-first/05-docs-review.log`, `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T033505Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Shared shell-env interpreter extracted from `scripts/lib/review-execution-state.ts`. Evidence: `scripts/lib/review-execution-state.ts`
- [ ] Focused `review-execution-state` regressions prove the extracted interpreter preserves current shell-env behavior. Evidence: `tests/review-execution-state.spec.ts`

## Validation & Closeout

- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T033505Z-docs-first/02-spec-guard.log`
- [ ] `npm run docs:check`. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T033505Z-docs-first/03-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T033505Z-docs-first/04-docs-freshness.log`
