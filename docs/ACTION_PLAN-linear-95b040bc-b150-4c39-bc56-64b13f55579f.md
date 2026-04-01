# ACTION_PLAN - CO: Reduce steady-state Linear request burn across control-host and provider-worker flows

## Added by Bootstrap 2026-04-01

## Summary
- Goal: land the smallest shared-budget-aware Linear fix that reduces avoidable steady-state request spend while keeping issue truth and failure semantics explicit.
- Scope: docs-first packet, shared Linear budget-state owner, control-host poll backoff, helper fail-fast gates, worker proof or observability surfacing, focused regressions, and required repo validation.
- Assumptions:
  - the same Linear token is reused across control-host, provider-worker, and helper flows in ordinary operation
  - GraphQL response headers are the narrowest trustworthy input for shared budget awareness
  - current control-host polling health and worker proof surfaces are the right places to surface suppression decisions

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO-33` and `CO-34`, focus on `steady-state request burn`, and keep `control-host polling`, `issue-context`, `upsert-workpad`, `reset window`, and `hourly bucket` explicit in docs and code.
- Not done if:
  - control-host polling remains fixed and budget-blind
  - shared cooldown metadata is not persisted across callers
  - helper flows still burn multi-step requests after the latest known budget is already exhausted or clearly insufficient
- Pre-implementation issue-quality review: approved. The issue is correctly broader than the two narrow `CO-33`/`CO-34` seams but still bounded to budget-awareness and truthful rate-limit handling rather than a provider rewrite.

## Milestones & Sequencing
1) Bootstrap docs and registry mirrors
2) Run audited docs-review child stream and fold any docs corrections back into the packet
3) Implement the shared Linear budget-state seam and feed it from GraphQL success and explicit rate-limit responses
4) Wire the control-host poll scheduler, helper guards, and worker proof or observability surfaces to that shared state
5) Run focused regressions, repo validation, standalone review, and explicit elegance review before deciding on PR handoff

## Dependencies
- `orchestrator/src/cli/control/linearGraphqlClient.ts`
- `orchestrator/src/cli/control/linearRateLimit.ts`
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/LinearDispatchSource.test.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-95b040bc-b150-4c39-bc56-64b13f55579f node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-62-docs-review --format json`
  - focused Vitest coverage for the selected budget-awareness seam
  - `MCP_RUNNER_TASK_ID=linear-95b040bc-b150-4c39-bc56-64b13f55579f node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-95b040bc-b150-4c39-bc56-64b13f55579f node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-95b040bc-b150-4c39-bc56-64b13f55579f npm run build`
  - `MCP_RUNNER_TASK_ID=linear-95b040bc-b150-4c39-bc56-64b13f55579f npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-95b040bc-b150-4c39-bc56-64b13f55579f npm run test`
  - `MCP_RUNNER_TASK_ID=linear-95b040bc-b150-4c39-bc56-64b13f55579f npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-95b040bc-b150-4c39-bc56-64b13f55579f npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-95b040bc-b150-4c39-bc56-64b13f55579f node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-95b040bc-b150-4c39-bc56-64b13f55579f FORCE_CODEX_REVIEW=1 npm run review`
- Rollback plan:
  - revert the shared budget-state wiring and restore prior fixed scheduling or helper behavior if the new guard blocks truthful operations without concrete budget evidence
  - keep any follow-up narrower than this lane and file it separately instead of broadening the rollback window

## Risks & Mitigations
- Risk: the shared budget guard blocks too aggressively on stale samples.
  - Mitigation: only fail fast when the sample is fresh and the active cooldown or insufficient remaining budget is explicit.
- Risk: a new shared state path drifts between control-host and provider-worker environments.
  - Mitigation: key the state from shared env or token fingerprint and cover the path contract in focused tests.
- Risk: polling backoff becomes invisible to operators.
  - Mitigation: carry the chosen interval, next poll, and suppression reason through existing polling health or observability surfaces.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-01
