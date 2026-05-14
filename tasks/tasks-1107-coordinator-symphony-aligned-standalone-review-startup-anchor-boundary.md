# Task Checklist - 1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary

- MCP Task ID: `1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`
- TECH_SPEC: `tasks/specs/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`

> This lane follows `1106` by fixing the remaining diff-mode startup broadening gap in standalone review telemetry instead of reopening `ControlServer` extraction work.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `tasks/specs/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `tasks/tasks-1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `.agent/task/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1107-standalone-review-startup-anchor-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `docs/findings/1107-standalone-review-startup-anchor-boundary-deliberation.md`.
- [x] docs-review approval/override captured for registered `1107`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045003Z-docs-first/05-docs-review-override.md`.

## Standalone Review Startup-Anchor Boundary

- [x] Diff-mode review tracks whether a touched-path or diff anchor has been established before off-task meta-surface activity. Evidence: `scripts/lib/review-execution-state.ts`.
- [x] Repeated pre-anchor reads of memory/skills/manifests/review artifacts now trigger the startup-anchor boundary instead of disappearing behind later nearby-code inspection. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`.
- [x] Diff-mode prompt guidance explicitly tells the reviewer to start with touched paths, scoped diff commands, or nearby changed code before memory/skills/manifests/review artifacts. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`.
- [x] Focused regression coverage proves the startup-anchor fix without reopening unrelated review-wrapper policy. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/08-diff-budget.log`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/10-pack-smoke.log`.
- [x] Manual startup-anchor evidence captured. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/11-manual-startup-anchor-check.json`.
- [x] Elegance review completed. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/12-elegance-review.md`.
