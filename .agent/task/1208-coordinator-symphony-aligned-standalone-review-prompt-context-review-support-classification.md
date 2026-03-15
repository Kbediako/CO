# Task Checklist - 1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification

- MCP Task ID: `1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`
- TECH_SPEC: `tasks/specs/1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`, `tasks/specs/1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`, `tasks/tasks-1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`, `.agent/task/1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`
- [x] Deliberation/findings captured for the classification lane. Evidence: `docs/findings/1208-standalone-review-prompt-context-review-support-classification-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md`, `docs/findings/1208-standalone-review-prompt-context-review-support-classification-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1208`. Evidence: `out/1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification/manual/20260315T025409Z-docs-first/05-docs-review.log`, `out/1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification/manual/20260315T025409Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Prompt-context helper files are classified as `review-support`. Evidence: `scripts/lib/review-execution-state.ts`
- [ ] Focused review-state / review-wrapper regressions prove the new helper family inherits the existing support classification behavior. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`

## Validation & Closeout

- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification/manual/20260315T025409Z-docs-first/02-spec-guard.log`
- [x] `npm run docs:check`. Evidence: `out/1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification/manual/20260315T025409Z-docs-first/03-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification/manual/20260315T025409Z-docs-first/04-docs-freshness.log`
