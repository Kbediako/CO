# Task Checklist - 1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints

- MCP Task ID: `1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints.md`
- TECH_SPEC: `tasks/specs/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints.md`

> This lane aligns the partial-output hint with existing boundary-family truth instead of widening into a general retry/transport rewrite.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/20260312T120754Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1137-standalone-review-boundary-driven-partial-output-hints-deliberation.md`, `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/20260312T120754Z-docs-first/00-summary.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/20260312T120754Z-docs-first/00-summary.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints.md`, `docs/findings/1137-standalone-review-boundary-driven-partial-output-hints-deliberation.md`, `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/20260312T120754Z-docs-first/00-summary.md`
- [x] docs-review approval or explicit override captured for registered `1137`. Evidence: `.runs/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/cli/2026-03-12T12-10-41-018Z-8abdbb5e/manifest.json`, `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/20260312T120754Z-docs-first/00-summary.md`

## Partial Output Hint Contract

- [ ] The partial-output hint no longer depends on `error.timedOut`. Evidence: `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/<timestamp>-closeout/00-summary.md`, `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/<timestamp>-closeout/05-targeted-tests.log`
- [ ] `timeout`, `stall`, and `startup-loop` still print `Review output log (partial)`. Evidence: `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/<timestamp>-closeout/00-summary.md`, `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/<timestamp>-closeout/05-targeted-tests.log`
- [ ] Non-timeout boundaries do not print the partial-output hint. Evidence: `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/<timestamp>-closeout/00-summary.md`, `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/<timestamp>-closeout/05-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `npm run review`
- [ ] `npm run pack:smoke`
- [ ] Manual/mock evidence captured for the boundary-driven partial-output hint contract.
- [ ] Elegance review completed.
