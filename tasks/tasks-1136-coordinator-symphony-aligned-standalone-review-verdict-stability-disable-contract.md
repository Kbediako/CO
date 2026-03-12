# Task Checklist - 1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract

- MCP Task ID: `1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract.md`
- TECH_SPEC: `tasks/specs/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract.md`

> This lane hardens the documented verdict-stability disable contract without broadening into review-termination taxonomy redesign.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T113712Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1136-standalone-review-verdict-stability-disable-contract-deliberation.md`, `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T113712Z-docs-first/00-summary.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T113712Z-docs-first/00-summary.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract.md`, `docs/findings/1136-standalone-review-verdict-stability-disable-contract-deliberation.md`, `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T113712Z-docs-first/00-summary.md`
- [x] docs-review approval or explicit override captured for registered `1136`. Evidence: `.runs/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/cli/2026-03-12T11-40-26-677Z-dd001104/manifest.json`, `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T113712Z-docs-first/00-summary.md`

## Disable Contract

- [x] Shared wrapper env setup clears `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS`. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/00-summary.md`, `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/05-targeted-tests.log`
- [x] An explicit wrapper regression proves `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS=0` disables the verdict-stability guard. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/00-summary.md`, `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/05-targeted-tests.log`
- [x] Disabled-path stderr and telemetry fall back to the existing non-verdict-stability transport. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/00-summary.md`, `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/05-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/06-test.log`, `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/13-override-notes.md`
- [x] `npm run docs:check`. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/07-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/08-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/09-diff-budget.log`
- [x] `npm run review`. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/10-review.log`, `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke`. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/11-pack-smoke.log`
- [x] Manual/mock evidence captured for the verdict-stability disable contract. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/12-manual-verdict-stability-disable-check.md`
- [x] Elegance review completed. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/15-elegance-review.md`
