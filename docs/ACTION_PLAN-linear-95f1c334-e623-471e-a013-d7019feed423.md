# ACTION_PLAN - CO: Harden Linear rate-limit handling with user-scoped budgeting, endpoint-aware buckets, and complexity-aware preflight

## Added by Bootstrap 2026-04-07

## Summary
- Goal: land the smallest coherent hardening pass on top of the existing shared Linear budget substrate so quota scope, endpoint pressure, complexity headroom, and concurrent smoothing become truthful enough for normal multi-process operation.
- Scope: docs-first packet, delegated docs-review, user-scoped budget identity, endpoint-aware bucket persistence and aliases, complexity-aware plus reservation-aware preflight, safe observation merge, jittered degraded polling, focused regressions, and the required validation or review gates.
- Assumptions:
  - the same Linear user quota can be exercised by more than one token or process, so token-only persistence is no longer an acceptable canonical key
  - endpoint-specific quota information is only trustworthy when captured directly from Linear headers
  - the existing `linearBudgetState.ts` helper and lock-file path are the correct place to coordinate reservations or smoothing

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `user-scoped budgeting`, `endpoint-aware buckets`, `complexity-aware preflight`, `x-ratelimit-endpoint-name`, `x-complexity`, `cooldown precedence`, and `reservation/smoothing across concurrent processes`; keep the work focused on `linearGraphqlClient.ts`, `linearRateLimit.ts`, `linearBudgetState.ts`, `linearDispatchSource.ts`, `providerLinearWorkflowFacade.ts`, and `controlServerPublicLifecycle.ts`.
- Not done if:
  - canonical persistence is still effectively token-only
  - endpoint buckets remain unkeyed or preflight still ignores complexity headroom
  - mixed observations can still clobber richer prior bucket data
  - polling remains fixed-tier without jitter
  - concurrent callers still coordinate only reactively with no reservation or residual-risk follow-up
- Pre-implementation issue-quality review: approved. The issue is broader than a header-only fix but still bounded to truthful rate-limit modeling and scheduling hardening on top of `CO-62`, not a provider-control-plane rewrite.

## Milestones & Sequencing
1) Draft and register the docs-first packet, including the task mirrors and registry entries
2) Run an audited `docs-review` child stream and fold any packet corrections back in before code changes
3) Implement the budget-state schema and helper changes for user scope, endpoint buckets, request-complexity capture, merge semantics, and reservation-aware preflight
4) Wire the dispatch, provider helper, and control-host polling call sites to the hardened budget contract
5) Add focused regressions, rerun required validation, then perform standalone review and explicit elegance review before any PR or review-state handoff

## Dependencies
- `orchestrator/src/cli/control/linearGraphqlClient.ts`
- `orchestrator/src/cli/control/linearRateLimit.ts`
- `orchestrator/src/cli/control/linearBudgetState.ts`
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/tests/LinearGraphqlClient.test.ts`
- `orchestrator/tests/LinearBudgetState.test.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `orchestrator/tests/LinearDispatchSource.test.ts`
- `orchestrator/tests/ControlServerPublicLifecycle.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-95f1c334-e623-471e-a013-d7019feed423 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-106-docs-review --format json`
  - focused Vitest coverage for `LinearGraphqlClient`, `LinearBudgetState`, `ProviderLinearWorkflowFacade`, and any dispatch or control-host tests touched by the implementation
  - `MCP_RUNNER_TASK_ID=linear-95f1c334-e623-471e-a013-d7019feed423 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-95f1c334-e623-471e-a013-d7019feed423 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-95f1c334-e623-471e-a013-d7019feed423 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-95f1c334-e623-471e-a013-d7019feed423 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-95f1c334-e623-471e-a013-d7019feed423 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-95f1c334-e623-471e-a013-d7019feed423 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-95f1c334-e623-471e-a013-d7019feed423 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-95f1c334-e623-471e-a013-d7019feed423 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-95f1c334-e623-471e-a013-d7019feed423 FORCE_CODEX_REVIEW=1 npm run review`
- Rollback plan:
  - revert to the existing `CO-62` shared-budget behavior if the hardening introduces false-positive fail-fast or reservation deadweight that is not backed by explicit budget evidence
  - split any overflow into a same-project follow-up instead of widening this lane past rate-limit truth and scheduling

## Risks & Mitigations
- Risk: user-scoped persistence creates a cold-start gap before viewer identity is known.
  - Mitigation: keep a deterministic bootstrap alias path and prove the migration behavior in targeted tests.
- Risk: endpoint-aware preflight blocks the wrong operations when endpoint identity is stale or unknown.
  - Mitigation: use server-provided endpoint names as canonical, keep explicit aliasing, and fail open when the endpoint cannot yet be trusted.
- Risk: reservation smoothing leaves stale reservations after process death.
  - Mitigation: store expiry timestamps and subtract only active reservations under the shared lock.
- Risk: jittered polling obscures operational diagnosis.
  - Mitigation: persist the chosen interval, next poll, and reason through existing polling-health state and tests.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-07
