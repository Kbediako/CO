# Task Checklist - 1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary

- MCP Task ID: `1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`
- TECH_SPEC: `tasks/specs/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`

> This lane narrows prompt-side scope summaries after `1097` so review stays on canonical changed-surface identity instead of broad branch-history framing.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `tasks/specs/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `tasks/tasks-1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `.agent/task/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1098-standalone-review-canonical-scope-summary-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `docs/findings/1098-standalone-review-canonical-scope-summary-boundary-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1098`.

## Canonical Scope-Summary Boundary

- [ ] Prompt-side scope summaries are reduced to canonical changed-surface identity data.
- [ ] Branch-history framing no longer appears in the narrowed review scope summary.
- [ ] Review prompts still expose the bounded changed-file identity reviewers need.
- [ ] Focused regression coverage proves the new scope-summary contract without changing `review-execution-state.ts`.

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
- [ ] Manual canonical scope-summary evidence captured.
- [ ] Elegance review completed.
