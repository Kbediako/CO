# Task Checklist - 1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split

- MCP Task ID: `1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md`
- TECH_SPEC: `tasks/specs/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md`

> This lane splits standalone review into a default diff-only surface and an explicit audit surface so bounded review stops carrying checklist/docs/evidence context by default.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md`, `tasks/specs/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md`, `tasks/tasks-1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md`, `.agent/task/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1093-standalone-review-diff-audit-surface-split-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md`, `docs/findings/1093-standalone-review-diff-audit-surface-split-deliberation.md`.
- [x] docs-review approval/override captured for registered `1093`. Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T152727Z-docs-first/05-docs-review-override.md`.

## Standalone Review Diff/Audit Surface Split

- [x] Default standalone review surface is diff-only and bounded. Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/11-manual-diff-surface-prompt.txt`, `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/13-manual-review-surface-check.json`.
- [x] Broader docs/checklist/evidence verification moves behind an explicit audit surface. Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/12-manual-audit-surface-prompt.txt`, `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/13-manual-review-surface-check.json`.
- [x] Prompt-contract coverage proves the default review surface omits audit context. Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `.runs/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split-scout/cli/2026-03-09T15-39-44-415Z-4846f14f/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/02-spec-guard.log`.
- [x] `npm run build` Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/03-build.log`.
- [x] `npm run lint` Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/04-lint.log`.
- [x] `npm run test` Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/05-test.log`.
- [x] `npm run docs:check` Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness` Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/08-diff-budget.log`.
- [x] `npm run review` Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/09-review.log` (explicit override; see `13-override-notes.md`).
- [x] `npm run pack:smoke` Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/10-pack-smoke.log`.
- [x] Manual review-surface evidence captured. Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/11-manual-diff-surface-prompt.txt`, `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/12-manual-audit-surface-prompt.txt`, `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/13-manual-review-surface-check.json`.
- [x] Elegance review completed. Evidence: `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/12-elegance-review.md`.
