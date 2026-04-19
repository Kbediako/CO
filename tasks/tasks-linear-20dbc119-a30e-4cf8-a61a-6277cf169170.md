# Task Checklist - linear-20dbc119-a30e-4cf8-a61a-6277cf169170

- MCP Task ID: `linear-20dbc119-a30e-4cf8-a61a-6277cf169170`
- Primary PRD: `docs/PRD-linear-20dbc119-a30e-4cf8-a61a-6277cf169170.md`
- TECH_SPEC: `tasks/specs/linear-20dbc119-a30e-4cf8-a61a-6277cf169170.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-20dbc119-a30e-4cf8-a61a-6277cf169170.md`

## Docs-first
- [x] PRD drafted for CO-259. Evidence: `docs/PRD-linear-20dbc119-a30e-4cf8-a61a-6277cf169170.md`.
- [x] TECH_SPEC drafted and mirrored. Evidence: `tasks/specs/linear-20dbc119-a30e-4cf8-a61a-6277cf169170.md`, `docs/TECH_SPEC-linear-20dbc119-a30e-4cf8-a61a-6277cf169170.md`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-20dbc119-a30e-4cf8-a61a-6277cf169170.md`.
- [x] `tasks/index.json`, `.agent/task`, `docs/TASKS.md`, and freshness registry mirrors are updated. Evidence: `tasks/index.json`, `.agent/task/linear-20dbc119-a30e-4cf8-a61a-6277cf169170.md`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] docs-review approves the CO-259 packet before implementation. Evidence: `.runs/linear-20dbc119-a30e-4cf8-a61a-6277cf169170-docs-review/cli/2026-04-19T05-21-36-574Z-dfd59f6e/manifest.json` (succeeded; spec-guard succeeded).

## Linear / Parallelization
- [x] Live issue context inspected before transition. Evidence: `linear issue-context --issue-id 20dbc119-a30e-4cf8-a61a-6277cf169170`.
- [x] Issue moved from `Ready` to `In Progress`. Evidence: `linear transition --issue-id 20dbc119-a30e-4cf8-a61a-6277cf169170 --state "In Progress"`.
- [x] Pre-turn matrix and `parallelize_now` decision recorded. Evidence: Linear workpad and `linear parallelization`.
- [x] Same-issue child lane `followup-regression-tests` completes and is accepted, rejected, or invalidated. Evidence: `.runs/linear-20dbc119-a30e-4cf8-a61a-6277cf169170-followup-regression-tests/cli/2026-04-19T05-16-55-881Z-22c45ca8/manifest.json` (succeeded, patch rejected because it omitted explicit canonical-owner-key input/marker assertions).

## Implementation
- [x] `docs:freshness:maintain` emits deterministic `canonical_owner_key` / marker values for candidate cohorts. Evidence: `scripts/docs-freshness-maintain.mjs`, `tests/docs-freshness-maintain.spec.ts`.
- [x] `linear create-follow-up` accepts canonical owner key input and reuses exact open same-team same-project owners. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/src/cli/linearCliShell.ts`.
- [x] Newly-created canonical owners are stamped in a deterministic issue section. Evidence: `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`.
- [x] Reused/created owner paths preserve relation and audit evidence. Evidence: `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`.
- [x] Provider-worker guidance prefers canonical-owner reuse/update for recurring baseline debt. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `skills/linear/SKILL.md`.

## Validation
- [x] Focused regression tests pass. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderLinearWorkflowFacade.test.ts orchestrator/tests/LinearCliShell.test.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts tests/docs-freshness-maintain.spec.ts` (4 files / 436 tests passed after final manual-review fix).
- [x] `node scripts/delegation-guard.mjs`. Evidence: passed with 2 subagent manifests found.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed.
- [x] `npm run build`. Evidence: passed.
- [x] `npm run lint`. Evidence: passed; existing `no-explicit-any` warnings remain in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run test`. Evidence: passed, 345 files / 4253 tests after final manual-review fix.
- [x] `npm run docs:check`. Evidence: passed.
- [x] `npm run docs:freshness`. Evidence: passed, 4187 docs / 4190 registry entries.
- [x] `npm run repo:stewardship`. Evidence: passed, 5279 tracked files / 0 action-required.
- [x] `node scripts/diff-budget.mjs`. Evidence: override accepted with CO-259 scope justification for 2068 changed lines after final manual-review fix.
- [x] `npm run pack:smoke`. Evidence: passed.
- [x] Manifest-backed standalone review. Evidence: `.runs/linear-20dbc119-a30e-4cf8-a61a-6277cf169170/cli/2026-04-19T05-14-33-727Z-32b7b141/review/telemetry.json` reports `review_outcome=bounded-success`; output drifted into live-control context, so manual diff-local fallback was recorded.
- [x] Explicit elegance/minimality pass. Evidence: `out/linear-20dbc119-a30e-4cf8-a61a-6277cf169170/manual/20260419T165650Z-manual-review-elegance.md`.

## Delivery
- [ ] Open/attach PR for CO-259.
- [ ] Run `codex-orchestrator pr ready-review` drain and handle actionable feedback.
- [ ] Merge latest `origin/main`, refresh the workpad, and move to `In Review` only after gates are clean.
