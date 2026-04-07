# Task Checklist - linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844

- Linear Issue: `CO-108` / `e09ce1db-e2f8-4fe7-9509-9f61a02f4844`
- MCP Task ID: `linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844`
- Primary PRD: `docs/PRD-linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`
- Task spec: `tasks/specs/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` were drafted or refreshed for `CO-108`. Evidence: bootstrap packet created in the current workspace on 2026-04-07.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`.
- [x] Docs-review delegation evidence was captured and the repo `docs/TASKS.md` line-budget failure was recorded truthfully as manual fallback rather than blocking the lane. Evidence: `/Users/kbediako/Code/CO/.workspaces/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844/.runs/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844-co-108-docs-review/cli/2026-04-07T14-43-58-099Z-9d3f8f3c/manifest.json`, `out/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844/manual/20260407T144358Z-docs-review-fallback.md`.

## Implementation
- [x] `ControlPollingHealthPayload` projects authoritative next-refresh truth for cooldown suppression, real checking, and ordinary scheduling. Evidence: `orchestrator/src/cli/control/providerPollingHealth.ts`, `orchestrator/tests/ProviderPollingHealth.test.ts`, `orchestrator/tests/LinearBudgetState.test.ts`.
- [x] `controlRuntime.ts` preserves truthful projected next-refresh output from persisted polling state across restart or rehydrate. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/tests/ControlRuntime.test.ts`.
- [x] `compatibilityIssuePresenter.ts` and `controlStatusDashboard.ts` consume projected next-refresh truth instead of raw renderer-local heuristics. Evidence: `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/controlStatusDashboard.ts`, `orchestrator/tests/CompatibilityIssuePresenter.test.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`.
- [x] Requests-exhausted and complexity-exhausted paths both keep truthful next-refresh output. Evidence: `orchestrator/tests/CompatibilityIssuePresenter.test.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`.
- [x] Focused regression coverage was added for the projected next-refresh contract and bounded STATUS rendering. Evidence: `npx vitest run orchestrator/tests/ProviderPollingHealth.test.ts orchestrator/tests/LinearBudgetState.test.ts orchestrator/tests/CompatibilityIssuePresenter.test.ts orchestrator/tests/ControlServerPublicLifecycle.test.ts orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/ControlStatusDashboard.test.ts`.

## Validation
- [x] Proof records the verified current-main truth and the bounded delta for CO-108. Evidence: issue packet in `docs/PRD-linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`, `docs/TECH_SPEC-linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`, and the focused regression suite above.
- [x] Focused tests confirm cooldown countdown, cooldown-to-checking transition, and stale mismatch regression for projected next-refresh truth. Evidence: `npx vitest run orchestrator/tests/ProviderPollingHealth.test.ts orchestrator/tests/LinearBudgetState.test.ts orchestrator/tests/CompatibilityIssuePresenter.test.ts orchestrator/tests/ControlServerPublicLifecycle.test.ts orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/ControlStatusDashboard.test.ts`.
- [x] The required validation floor was executed on the branch head. Branch-local gates passed for `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke`; `npm run docs:freshness` failed only on the existing repo-wide stale-doc baseline (`121` stale docs), which is recorded with supplemental report artifacts in `out/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844/docs-freshness.json` and `out/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844/docs-freshness.md`.
- [x] Manifest-backed standalone review was attempted before handoff, and an explicit elegance/minimality pass was recorded after the wrapper boundary failure fallback. Evidence: `/Users/kbediako/Code/CO/.runs/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844/cli/2026-04-07T14-34-59-047Z-08aed6fc/review/telemetry.json`, `out/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844/manual/20260407T151354Z-review-fallback.md`.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: `linear upsert-workpad` updated comment `079a9ceb-09f0-4fac-a850-57a09da0eeb2` on 2026-04-07T15:14Z.
- [x] A PR is attached before any review-state handoff. Evidence: PR `#376` (`https://github.com/Kbediako/CO/pull/376`) is attached to Linear issue `CO-108` via existing attachment `f7b7af22-8cb2-4181-87e7-9d97c8cfd128`.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `Human Review` / `In Review` only after coding stops. Evidence: pending.
