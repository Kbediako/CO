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

- [ ] Startup-loop failures persist a stable first-class `termination_boundary` record. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`
- [ ] Terminal failure output prints one stable startup-loop classification/provenance line while preserving the existing startup-loop message. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`, `REPLACE-REVIEW-LOG`
- [ ] Cross-stream fragmented startup-loop text still falls back to plain timeout rather than startup-loop classification. Evidence: `REPLACE-CLOSEOUT-SUMMARY`, `REPLACE-TARGETED-TESTS`

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
- [ ] Manual/mock evidence captured for startup-loop boundary classification. Evidence: `REPLACE-MANUAL`
- [ ] Elegance review completed. Evidence: `REPLACE-ELEGANCE`
