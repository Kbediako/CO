# Task Checklist - 1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary

- MCP Task ID: `1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md`
- TECH_SPEC: `tasks/specs/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md`

> This lane tightens default `diff` review so it stops broadening into adjacent review-system surfaces after the `1093` diff/audit split.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md`, `tasks/specs/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md`, `tasks/tasks-1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md`, `.agent/task/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1094-standalone-review-self-containment-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md`, `docs/findings/1094-standalone-review-self-containment-boundary-deliberation.md`.
- [x] docs-review approval/override captured for registered `1094`. Evidence: `out/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary/manual/20260309T164023Z-docs-first/00-summary.md`, `out/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary/manual/20260309T164023Z-docs-first/05-docs-review-override.md`, `.runs/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary/cli/2026-03-09T16-41-17-242Z-d192df00/manifest.json`.

## Standalone Review Self-Containment Boundary

- [ ] Default `diff` review treats adjacent review-system surfaces as off-task unless the diff explicitly requires them.
- [ ] Runtime guard fails on sustained drift into review docs, review artifacts, or pack-smoke helpers.
- [ ] Regression coverage proves the new boundary without reopening the `1093` diff/audit contract.

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
- [ ] Manual review-boundary evidence captured.
- [ ] Elegance review completed.
