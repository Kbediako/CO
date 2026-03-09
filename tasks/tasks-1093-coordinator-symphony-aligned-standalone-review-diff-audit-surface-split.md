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
- [ ] docs-review approval/override captured for registered `1093`.

## Standalone Review Diff/Audit Surface Split

- [ ] Default standalone review surface is diff-only and bounded.
- [ ] Broader docs/checklist/evidence verification moves behind an explicit audit surface.
- [ ] Prompt-contract coverage proves the default review surface omits audit context.

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
- [ ] Manual review-surface evidence captured.
- [ ] Elegance review completed.
