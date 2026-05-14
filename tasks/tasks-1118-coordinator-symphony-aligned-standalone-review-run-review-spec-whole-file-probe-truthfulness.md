# Task Checklist - 1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness

- MCP Task ID: `1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`
- TECH_SPEC: `tasks/specs/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`

> This lane follows `1117` by correcting stale whole-file non-determinism claims around `run-review.spec.ts` and recording reporter-aware terminal evidence before any further harness or product work is attempted.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`, `tasks/specs/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`, `tasks/tasks-1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`, `.agent/task/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113436Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1118-standalone-review-run-review-spec-whole-file-probe-truthfulness-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`, `docs/findings/1118-standalone-review-run-review-spec-whole-file-probe-truthfulness-deliberation.md`.

## Whole-File Probe Truthfulness

- [x] Current task/docs artifacts no longer claim `tests/run-review.spec.ts` remains non-deterministic without reporter-aware terminal evidence. Evidence: `docs/TASKS.md`, `tasks/specs/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`.
- [x] The authoritative current-tree evidence records successful whole-file runs for the default and verbose reporters. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/05a-default-whole-file.log`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/05b-verbose-whole-file.log`.
- [x] The old startup-banner-only probe is treated as non-diagnostic rather than proof of a monolithic defect. Evidence: `tasks/specs/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05d-whole-file-probe.log`.
- [x] The slice keeps code out of scope unless fresh reporter-aware evidence forces a real defect back into play. Evidence: `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/05-test.log`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/05a-default-whole-file.log`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/05b-verbose-whole-file.log`.
- [x] `npm run docs:check`. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/10-pack-smoke.log`.
- [x] Manual validation-truthfulness evidence captured. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/11-manual-whole-file-probe-check.json`.
- [x] Elegance review completed. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/12-elegance-review.md`.
