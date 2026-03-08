# Task Checklist - 1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard

- MCP Task ID: `1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`
- TECH_SPEC: `tasks/specs/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`

> This lane turns the remaining `1060` review-wrapper drift into one bounded command-intent boundary seam owned by the shared review execution state.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `tasks/specs/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `tasks/tasks-1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `.agent/task/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1061-standalone-review-command-intent-boundary-guard-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `docs/findings/1061-standalone-review-command-intent-boundary-guard-deliberation.md`.
- [x] docs-review approval/override captured for registered `1061`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T061939Z-docs-first/05-docs-review-override.md`.

## Standalone Review Command-Intent Boundary Guard

- [ ] `ReviewExecutionState` exposes explicit command-intent boundary classification from live runtime facts. Evidence: `<pending>`.
- [ ] `scripts/run-review.ts` fails closed on bounded-policy-violating command launches. Evidence: `<pending>`.
- [ ] Targeted review-wrapper coverage proves policy-violating command intents now terminate deterministically. Evidence: `<pending>`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `<pending>`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `<pending>`.
- [ ] `npm run build`. Evidence: `<pending>`.
- [ ] `npm run lint`. Evidence: `<pending>`.
- [ ] `npm run test`. Evidence: `<pending>`.
- [ ] `npm run docs:check`. Evidence: `<pending>`.
- [ ] `npm run docs:freshness`. Evidence: `<pending>`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `<pending>`.
- [ ] `npm run review`. Evidence: `<pending>`.
- [ ] `npm run pack:smoke`. Evidence: `<pending>`.
- [ ] Manual review-wrapper/runtime artifact captured. Evidence: `<pending>`.
- [ ] Elegance review completed. Evidence: `<pending>`.
