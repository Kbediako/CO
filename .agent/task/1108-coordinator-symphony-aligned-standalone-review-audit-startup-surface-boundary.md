# Task Checklist - 1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary

- MCP Task ID: `1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md`
- TECH_SPEC: `tasks/specs/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md`

> This lane follows `1107` by finishing the remaining startup-order asymmetry in standalone review reliability before reopening broader Symphony-aligned work.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md`, `tasks/specs/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md`, `tasks/tasks-1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md`, `.agent/task/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1108-standalone-review-audit-startup-surface-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md`, `docs/findings/1108-standalone-review-audit-startup-surface-boundary-deliberation.md`.
- [x] docs-review approval/override captured for registered `1108`. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T065400Z-docs-first/05-docs-review-override.md`.

## Audit Startup-Surface Boundary

- [x] Bounded audit-mode review tracks whether a valid audit startup anchor has been established before off-surface meta reads. Evidence: `scripts/lib/review-execution-state.ts`.
- [x] The active evidence manifest and active runner log remain valid bounded-audit startup anchors, while repeated pre-anchor memory/skills/review-doc reads trigger the audit startup boundary. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`.
- [x] Audit-mode prompt guidance explicitly tells the reviewer to start with the active manifest or runner log before memory, skills, or review docs. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`, `docs/standalone-review-guide.md`.
- [x] Focused regression coverage proves the audit startup-boundary fix without reopening sustained meta-surface or diff startup policy. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`, `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/01-delegation-guard.log`, `.runs/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary-scout/cli/2026-03-10T07-15-47-593Z-6e7a15fa/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/05-test.log`, `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/05-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/08-diff-budget.log`, `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/09-review.log`, `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/10-pack-smoke.log`.
- [x] Manual audit startup-boundary evidence captured. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/11-manual-audit-startup-check.json`.
- [x] Elegance review completed. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/12-elegance-review.md`.
