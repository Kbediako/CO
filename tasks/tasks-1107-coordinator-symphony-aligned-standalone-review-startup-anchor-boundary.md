# Task Checklist - 1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary

- MCP Task ID: `1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`
- TECH_SPEC: `tasks/specs/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`

> This lane follows `1106` by fixing the remaining diff-mode startup broadening gap in standalone review telemetry instead of reopening `ControlServer` extraction work.

## Foundation

- [ ] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `tasks/specs/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `tasks/tasks-1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `.agent/task/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`.
- [ ] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1107-standalone-review-startup-anchor-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [ ] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [ ] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md`, `docs/findings/1107-standalone-review-startup-anchor-boundary-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1107`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-docs-first/05-docs-review-override.md`.

## Standalone Review Startup-Anchor Boundary

- [ ] Diff-mode review tracks whether a touched-path or diff anchor has been established before off-task meta-surface activity. Evidence: `scripts/lib/review-execution-state.ts`.
- [ ] Repeated pre-anchor reads of memory/skills/manifests/review artifacts now trigger the startup-anchor boundary instead of disappearing behind later nearby-code inspection. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`.
- [ ] Diff-mode prompt guidance explicitly tells the reviewer to start with touched paths, scoped diff commands, or nearby changed code before memory/skills/manifests/review artifacts. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`.
- [ ] Focused regression coverage proves the startup-anchor fix without reopening unrelated review-wrapper policy. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/08-diff-budget.log`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/10-pack-smoke.log`.
- [ ] Manual startup-anchor evidence captured. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/11-manual-startup-anchor-check.json`.
- [ ] Elegance review completed. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/TODO-closeout/12-elegance-review.md`.
