# Task Checklist - 1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split

- MCP Task ID: `1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split.md`
- TECH_SPEC: `tasks/specs/1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split.md`

> This lane makes the existing generic timeout/stall branches first-class without broadening into retry-semantics redesign.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `out/1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split/manual/20260312T104300Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1135-standalone-review-timeout-stall-termination-boundary-taxonomy-split-deliberation.md`, `out/1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split/manual/20260312T104300Z-docs-first/00-summary.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `out/1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split/manual/20260312T104300Z-docs-first/00-summary.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split.md`, `docs/findings/1135-standalone-review-timeout-stall-termination-boundary-taxonomy-split-deliberation.md`, `out/1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split/manual/20260312T104300Z-docs-first/00-summary.md`
- [x] docs-review approval or explicit override captured for registered `1135`. Evidence: `.runs/1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split/cli/2026-03-12T10-50-46-717Z-c9962288/manifest.json`, `out/1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split/manual/20260312T104300Z-docs-first/00-summary.md`

## Output Contract

- [ ] Timeout failures persist a stable first-class `termination_boundary` record. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`
- [ ] Stall failures persist a stable first-class `termination_boundary` record. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`
- [ ] Terminal failure output prints stable timeout/stall classification lines while preserving the existing human-readable messages. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`, `REPLACE-REVIEW-LOG`

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
- [ ] Manual/mock evidence captured for timeout/stall boundary classification. Evidence: `REPLACE-MANUAL`
- [ ] Elegance review completed. Evidence: `REPLACE-ELEGANCE`
