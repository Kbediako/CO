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

- [x] Active-closeout reread failures persist a stable first-class `termination_boundary` record. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/00-summary.md`, `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/05-targeted-tests.log`
- [x] Active-closeout search/self-reference failures remain classified as `meta-surface-expansion`. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/00-summary.md`, `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/05-targeted-tests.log`, `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/09-review.log`
- [x] Terminal failure output prints one stable active-closeout reread classification/provenance line while preserving the current human-readable failure prose. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/00-summary.md`, `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/05-targeted-tests.log`, `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/09-review.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/05-test.log`, `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/13-override-notes.md`
- [x] `npm run docs:check`. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/08-diff-budget.log`
- [x] `npm run review`. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/09-review.log`, `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke`. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/10-pack-smoke.log`
- [x] Manual/mock evidence captured for the active-closeout taxonomy split. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/11-manual-active-closeout-taxonomy-check.md`
- [x] Elegance review completed. Evidence: `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T104800Z-closeout/12-elegance-review.md`
