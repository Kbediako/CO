# Task Checklist - 1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction

- MCP Task ID: `1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`
- TECH_SPEC: `tasks/specs/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`, `tasks/specs/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`, `tasks/tasks-1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`, `.agent/task/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`
- [x] Deliberation/findings captured for the extraction lane. Evidence: `docs/findings/1215-standalone-review-command-intent-classification-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md`, `docs/findings/1215-standalone-review-command-intent-classification-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1215`. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T095550Z-docs-first/05-docs-review.log`, `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T095550Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Shared command-intent classifier helpers extracted from `scripts/lib/review-execution-state.ts` into a bounded helper module without widening review-policy ownership. Evidence: `scripts/lib/review-command-intent-classification.ts`, `scripts/lib/review-execution-state.ts`, `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`
- [x] Focused regressions prove the extracted command-intent seam preserves orchestration-command detection, direct validation runner detection, package-script resolution, violation-label formatting, and helper-family `review-support` parity. Evidence: `tests/review-command-intent-classification.spec.ts`, `tests/review-meta-surface-normalization.spec.ts`, `tests/review-execution-state.spec.ts`, `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`

## Validation & Closeout

- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`
- [x] `npm run docs:check`. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`
- [x] `npm run docs:freshness`. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`
- [x] Task-scoped `node scripts/delegation-guard.mjs` passed with manifest-backed delegation evidence. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`, `.runs/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction-guard/cli/2026-03-15T10-13-39-313Z-26cc1dd9/manifest.json`
- [x] `npm run build` passed on the shipped tree. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`
- [x] `npm run lint` passed on the shipped tree. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`
- [x] Focused command-intent regressions passed. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`
- [x] Full validation lane passed on the shipped tree or the explicit override was recorded truthfully. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/13-override-notes.md`
- [x] `node scripts/diff-budget.mjs` passed with explicit override only if required. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/13-override-notes.md`
- [x] Bounded `npm run review` returned no findings or an explicit override was recorded truthfully. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke` passed. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`
- [x] Elegance review completed. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/12-elegance-review.md`
- [x] Closeout summary and explicit override notes recorded. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`, `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/13-override-notes.md`
