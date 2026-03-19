# Task Checklist - 1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition

- MCP Task ID: `1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md`
- TECH_SPEC: `tasks/specs/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md`

> This lane follows `1109` by turning repeated external shell verification into a bounded review stop condition before broader Symphony-aligned work resumes.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md`, `tasks/specs/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md`, `tasks/tasks-1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md`, `.agent/task/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1110-standalone-review-shell-probe-stop-condition-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md`, `docs/findings/1110-standalone-review-shell-probe-stop-condition-deliberation.md`.
- [x] docs-review approval/override captured for registered `1110`. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T015223Z-docs-first/05-docs-review-override.md`.

## Shell-Probe Stop Condition

- [x] Bounded review classifies repeated direct shell-probe verification separately from ordinary shell-wrapped inspection. Evidence: `scripts/lib/review-execution-state.ts`.
- [x] The first shell-probe verification command is allowed, but a repeated shell probe in the same bounded run trips a deterministic boundary. Evidence: `scripts/lib/review-execution-state.ts`, `scripts/run-review.ts`.
- [x] Ordinary shell-wrapped file reads and valid audit startup-anchor reads remain allowed. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`.
- [x] Runtime-facing coverage proves `run-review` terminates on repeated shell-probe activity without reopening heavy-command or command-intent policy. Evidence: `tests/run-review.spec.ts`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/05a-review-execution-state.log`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/05b-run-review.log`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/05c-shell-probe-subset.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/05-test.log`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/05a-review-execution-state.log`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/05b-run-review.log`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/05c-shell-probe-subset.log`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/08-diff-budget.log`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/09-review.log`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/10-pack-smoke.log`.
- [x] Manual shell-probe stop-condition evidence captured. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/11-manual-shell-probe-check.json`.
- [x] Elegance review completed. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/12-elegance-review.md`.
