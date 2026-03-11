# Task Checklist - 1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation

- MCP Task ID: `1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`
- TECH_SPEC: `tasks/specs/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`

> This lane follows `1116` by isolating `run-review.spec.ts` from ambient fake-Codex env leakage so harness failures are reproducible and do not masquerade as product-runtime defects.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `tasks/specs/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `tasks/tasks-1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `.agent/task/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1117-standalone-review-run-review-spec-harness-env-isolation-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `docs/findings/1117-standalone-review-run-review-spec-harness-env-isolation-deliberation.md`.

## Harness Env Isolation

- [x] Shared harness env assembly explicitly removes ambient fake-Codex control vars that should not leak into unrelated tests. Evidence: `tests/run-review.spec.ts`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05b-env-isolation-regression.log`.
- [x] A focused regression proves an ambient fake-Codex knob no longer flips an unrelated baseline review test red. Evidence: `tests/run-review.spec.ts`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05a-ambient-mode-baseline.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05b-env-isolation-regression.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05c-bounded-prompt-baseline.log`.
- [x] The slice stays harness-only unless deterministic evidence forces a product change. Evidence: `tests/run-review.spec.ts`, `tasks/specs/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/09-review.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05-test.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05a-ambient-mode-baseline.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05b-env-isolation-regression.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05c-bounded-prompt-baseline.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05d-whole-file-probe.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/08-diff-budget.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/10-pack-smoke.log`.
- [x] Manual harness verification captured. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/11-manual-harness-env-isolation-check.json`.
- [x] Elegance review completed. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/12-elegance-review.md`.
