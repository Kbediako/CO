# Task Checklist - 1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification

- MCP Task ID: `1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification.md`
- TECH_SPEC: `tasks/specs/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification.md`

> This lane makes the existing startup-loop detector first-class without broadening into timeout/stall taxonomy work.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T103600Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1134-standalone-review-startup-loop-termination-boundary-classification-deliberation.md`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T103600Z-docs-first/00-summary.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T103600Z-docs-first/00-summary.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification.md`, `docs/findings/1134-standalone-review-startup-loop-termination-boundary-classification-deliberation.md`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T103600Z-docs-first/00-summary.md`
- [x] docs-review approval or explicit override captured for registered `1134`. Evidence: `.runs/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/cli/2026-03-12T10-17-32-111Z-6086a0eb/manifest.json`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T110200Z-docs-first/00-summary.md`

## Output Contract

- [x] Startup-loop failures persist a stable first-class `termination_boundary` record. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/00-summary.md`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/05-targeted-tests.log`
- [x] Terminal failure output prints one stable startup-loop classification/provenance line while preserving the existing startup-loop message. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/00-summary.md`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/05-targeted-tests.log`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/10-review.log`
- [x] Cross-stream fragmented startup-loop text still falls back to plain timeout rather than startup-loop classification. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/00-summary.md`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/05-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/06-test.log`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/14-override-notes.md`
- [x] `npm run docs:check`. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/07-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/08-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/09-diff-budget.log`
- [x] `npm run review`. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/10-review.log`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/14-override-notes.md`
- [x] `npm run pack:smoke`. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/11-pack-smoke.log`
- [x] Manual/mock evidence captured for startup-loop boundary classification. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/12-manual-startup-loop-check.md`
- [x] Elegance review completed. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/13-elegance-review.md`
