# Task Checklist - 1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split

- MCP Task ID: `1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split.md`
- TECH_SPEC: `tasks/specs/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split.md`

> This lane makes active-closeout taxonomy explicit: search remains meta-surface expansion, rereads become first-class.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T113500Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1133-standalone-review-active-closeout-termination-boundary-taxonomy-split-deliberation.md`, `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T113500Z-docs-first/00-summary.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T113500Z-docs-first/00-summary.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split.md`, `docs/findings/1133-standalone-review-active-closeout-termination-boundary-taxonomy-split-deliberation.md`, `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T113500Z-docs-first/00-summary.md`
- [x] docs-review approval or explicit override captured for registered `1133`. Evidence: `.runs/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/cli/2026-03-12T09-29-08-276Z-ca62cb73/manifest.json`, `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T113500Z-docs-first/00-summary.md`

## Output Contract

- [ ] Active-closeout reread failures persist a stable first-class `termination_boundary` record. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`
- [ ] Active-closeout search/self-reference failures remain classified as `meta-surface-expansion`. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`, `REPLACE-REVIEW-LOG`
- [ ] Terminal failure output prints one stable active-closeout reread classification/provenance line while preserving the current human-readable failure prose. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`, `REPLACE-REVIEW-LOG`

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
- [ ] Manual/mock evidence captured for the active-closeout taxonomy split. Evidence: `REPLACE-MANUAL`
- [ ] Elegance review completed. Evidence: `REPLACE-ELEGANCE`
