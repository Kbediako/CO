# Task Checklist - 1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation

- MCP Task ID: `1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`
- TECH_SPEC: `tasks/specs/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`

> This lane follows `1116` by isolating `run-review.spec.ts` from ambient fake-Codex env leakage so harness failures are reproducible and do not masquerade as product-runtime defects.

## Foundation

- [ ] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `tasks/specs/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `tasks/tasks-1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `.agent/task/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`.
- [ ] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1117-standalone-review-run-review-spec-harness-env-isolation-deliberation.md`.

## Shared Registry + Review Handoff

- [ ] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [ ] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`, `docs/findings/1117-standalone-review-run-review-spec-harness-env-isolation-deliberation.md`.

## Harness Env Isolation

- [ ] Shared harness env assembly explicitly removes ambient fake-Codex control vars that should not leak into unrelated tests. Evidence: `tests/run-review.spec.ts`.
- [ ] A focused regression proves an ambient fake-Codex knob no longer flips an unrelated baseline review test red. Evidence: `tests/run-review.spec.ts`.
- [ ] The slice stays harness-only unless deterministic evidence forces a product change. Evidence: `tests/run-review.spec.ts`, `tasks/specs/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/TODO-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/TODO-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/TODO-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/TODO-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/TODO-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/TODO-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/TODO-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/TODO-closeout/08-diff-budget.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/TODO-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/TODO-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/TODO-closeout/10-pack-smoke.log`.
