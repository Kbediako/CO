# ACTION_PLAN - CO: Investigate control-host provider refresh stall that stops new Ready issue pickup until restart

## Added by Bootstrap 2026-03-30

## Traceability
- Linear issue: `CO-41` / `af97d673-43a4-4a36-8738-b7f61e5b71a1`
- Linear URL: https://linear.app/asabeko/issue/CO-41/co-investigate-control-host-provider-refresh-stall-that-stops-new
- Related evidence issues: `CO-39`, `CO-40` (out of scope)

## Summary
- Goal: Identify the blocking seam behind the March 30 control-host refresh stall and land the smallest repair that makes the failure class diagnosable and recoverable.
- Scope: docs-first packet, audited docs-review, stale-incident baseline inspection, minimal lifecycle/observability changes, focused regression or reproducer coverage, and required validation plus review gates.
- Assumptions:
  - the strongest current hypothesis is a wedged serialized refresh lifecycle rather than an eligibility query bug
  - the cited stale intake snapshot and worker manifests are sufficient to anchor the incident trace
  - existing `ProviderIssueHandoff`, refresh serialization, control runtime, and observability tests can cover the repair without building a new broad test harness

## Milestones & Sequencing
1) Register the `CO-41` docs-first packet, update `tasks/index.json`, refresh `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, mirror the checklist under `.agent/task/`, and keep the single Linear workpad aligned.
2) Run an audited child-stream `docs-review` for `linear-af97d673-43a4-4a36-8738-b7f61e5b71a1`, then refresh the spec/task packet with the manifest-backed approval.
3) Inspect the cited stale intake snapshot, worker manifests, and lifecycle code to identify the actual blocking seam and the narrowest safe recovery or restart-required contract.
4) Implement the minimal lifecycle and observability changes needed to detect the wedge, recover safely when possible, and surface explicit degraded or stuck evidence.
5) Add a focused reproducer or regression covering the stale-live-instance / healthy-refresh-replay class, run the required validation floor, then complete standalone review and elegance review before any handoff.

## Dependencies
- `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`
- `/Users/kbediako/Code/CO/.runs/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2/cli/2026-03-30T00-37-31-630Z-2b17999a/manifest.json`
- `/Users/kbediako/Code/CO/.runs/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d/cli/2026-03-30T00-37-32-639Z-1eda51e8/manifest.json`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/observabilityApiController.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`
- `orchestrator/tests/ControlRuntime.test.ts`
- `orchestrator/tests/ObservabilityApiController.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-af97d673-43a4-4a36-8738-b7f61e5b71a1 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-af97d673-43a4-4a36-8738-b7f61e5b71a1 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-af97d673-43a4-4a36-8738-b7f61e5b71a1 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --issue-id af97d673-43a4-4a36-8738-b7f61e5b71a1 --format json`
  - focused lifecycle/observability vitest coverage for the final repair seam
  - `MCP_RUNNER_TASK_ID=linear-af97d673-43a4-4a36-8738-b7f61e5b71a1 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-af97d673-43a4-4a36-8738-b7f61e5b71a1 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-af97d673-43a4-4a36-8738-b7f61e5b71a1 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-af97d673-43a4-4a36-8738-b7f61e5b71a1 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-af97d673-43a4-4a36-8738-b7f61e5b71a1 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-af97d673-43a4-4a36-8738-b7f61e5b71a1 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-af97d673-43a4-4a36-8738-b7f61e5b71a1 FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-af97d673-43a4-4a36-8738-b7f61e5b71a1 npm run pack:smoke` only if the final diff touches downstream-facing CLI/package/review-wrapper surfaces
- Rollback plan:
  - revert the watchdog or recovery behavior if it causes duplicate refresh execution or unsafe issue-claim movement
  - keep the smaller observability-only contract if safe auto-recovery proves too risky for this lane

## Risks & Mitigations
- Risk: a watchdog could create overlapping refresh executions and duplicate claims.
  - Mitigation: keep recovery inside the existing serialized contract and prefer explicit restart-required evidence over unsafe forced concurrency.
- Risk: observability could still timeout before emitting useful evidence.
  - Mitigation: persist refresh health metadata into the intake snapshot and expose the same state through API reads where practical.
- Risk: the reproducer may miss the exact real-world wedge condition.
  - Mitigation: anchor the test or harness on the cited stale-live incident evidence and the exact serialization seam identified during investigation.

## Approvals
- Reviewer: docs-review approved via `/Users/kbediako/Code/CO/.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-review/cli/2026-03-30T01-25-36-879Z-17cd2f7d/manifest.json`
- Date: 2026-03-30
