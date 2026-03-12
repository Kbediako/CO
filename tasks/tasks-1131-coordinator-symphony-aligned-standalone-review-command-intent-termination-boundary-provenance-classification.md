# Task Checklist - 1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification

- MCP Task ID: `1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md`
- TECH_SPEC: `tasks/specs/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md`

> This lane extends the compact standalone-review `termination_boundary` contract to the existing command-intent family only.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md`, `tasks/specs/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md`, `tasks/tasks-1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md`, `.agent/task/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md`, `out/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/manual/20260312T085700Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1131-standalone-review-command-intent-termination-boundary-provenance-classification-deliberation.md`, `out/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/manual/20260312T085700Z-docs-first/00-summary.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/manual/20260312T085700Z-docs-first/00-summary.md`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md`, `docs/findings/1131-standalone-review-command-intent-termination-boundary-provenance-classification-deliberation.md`, `out/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/manual/20260312T085700Z-docs-first/00-summary.md`.
- [x] docs-review approval or explicit override captured for registered `1131`. Evidence: `.runs/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/cli/2026-03-12T08-03-59-306Z-d8176408/manifest.json`, `out/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/manual/20260312T085700Z-docs-first/00-summary.md`

## Output Contract

- [ ] Failed telemetry persists a stable `termination_boundary` record for command-intent failures. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`
- [ ] Terminal failure output prints one stable command-intent boundary classification/provenance line while preserving the current human-readable failure prose. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`, `REPLACE-REVIEW-LOG`
- [ ] Existing `1130` supported families remain unchanged, and shell-probe / active-closeout / timeout-style families stay out of the taxonomy. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`, `REPLACE-REVIEW-LOG`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `REPLACE-DELEGATION-GUARD`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `REPLACE-SPEC-GUARD`
- [ ] `npm run build`. Evidence: `REPLACE-BUILD`
- [ ] `npm run lint`. Evidence: `REPLACE-LINT`
- [ ] `npm run test`. Evidence: `REPLACE-TEST`
- [ ] `npm run docs:check`. Evidence: `REPLACE-DOCS-CHECK`
- [ ] `npm run docs:freshness`. Evidence: `REPLACE-DOCS-FRESHNESS`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `REPLACE-DIFF-BUDGET`
- [ ] `npm run review`. Evidence: `REPLACE-REVIEW`
- [ ] `npm run pack:smoke`. Evidence: `REPLACE-PACK-SMOKE`
- [ ] Manual/mock evidence captured for the new command-intent termination-boundary contract. Evidence: `REPLACE-MANUAL`
- [ ] Elegance review completed. Evidence: `REPLACE-ELEGANCE`
