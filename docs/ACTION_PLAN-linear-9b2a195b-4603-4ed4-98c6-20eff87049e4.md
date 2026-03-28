# ACTION_PLAN - Fix Active Provider-Worker Linear Write-Back When Reads Succeed

## Added by Bootstrap 2026-03-28

## Traceability
- Linear issue: `CO-33` / `9b2a195b-4603-4ed4-98c6-20eff87049e4`
- Linear URL: https://linear.app/asabeko/issue/CO-33/co-fix-active-provider-worker-linear-write-back-when-reads-succeed

## Summary
- Goal: Finish `CO-33` by removing redundant provider-worker Linear preflight reads, surfacing rate limits explicitly, and validating the bounded write-back repair path.
- Scope: docs-first packet, live root-cause capture, targeted implementation in the Linear client/facade, focused regressions, required validation, and normal review handoff.
- Assumptions:
  - the active failure is caused by Linear request-budget exhaustion rather than invalid credentials or malformed mutations
  - a run-scoped cached `issue-context` result is sufficient to carry `transition` and `upsert-workpad` through the same attempt
  - current hourly request exhaustion may block live post-fix mutation verification until the reset window, so focused tests and explicit closeout caveats may be necessary

## Milestones & Sequencing
1) Register the CO-33 docs-first packet, update `tasks/index.json`, refresh `docs/TASKS.md`, and mirror the checklist under `.agent/task/`.
2) Capture the live rate-limit root cause in repo artifacts and confirm the bounded design: explicit rate-limit error mapping plus run-scoped issue-context reuse for `transition` and `upsert-workpad`.
3) Implement the smallest fix in the Linear GraphQL client and provider workflow facade.
4) Add focused regressions for the read-succeeds / write-fails seam on `transition` and `upsert-workpad`, plus explicit rate-limit classification coverage.
5) Run the required validation floor, refresh the workpad, and hand off only when the review bar is met or an evidence-backed blocker remains.

## Dependencies
- `orchestrator/src/cli/control/linearGraphqlClient.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/tests/LinearGraphqlClient.test.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `/Users/kbediako/Code/CO/.runs/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/cli/2026-03-28T09-08-12-918Z-060f9d7e/provider-linear-worker-linear-audit.jsonl`
- `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON="spawn_agent unavailable in this worker turn; using direct bounded implementation" MCP_RUNNER_TASK_ID=linear-9b2a195b-4603-4ed4-98c6-20eff87049e4 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-9b2a195b-4603-4ed4-98c6-20eff87049e4 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-9b2a195b-4603-4ed4-98c6-20eff87049e4 npx codex-orchestrator start docs-review --format json --no-interactive --task linear-9b2a195b-4603-4ed4-98c6-20eff87049e4`
  - focused vitest for `orchestrator/tests/LinearGraphqlClient.test.ts`
  - focused vitest for `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
  - `MCP_RUNNER_TASK_ID=linear-9b2a195b-4603-4ed4-98c6-20eff87049e4 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-9b2a195b-4603-4ed4-98c6-20eff87049e4 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-9b2a195b-4603-4ed4-98c6-20eff87049e4 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-9b2a195b-4603-4ed4-98c6-20eff87049e4 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-9b2a195b-4603-4ed4-98c6-20eff87049e4 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-9b2a195b-4603-4ed4-98c6-20eff87049e4 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-9b2a195b-4603-4ed4-98c6-20eff87049e4 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-9b2a195b-4603-4ed4-98c6-20eff87049e4 npm run pack:smoke` if downstream-facing CLI/package/review-wrapper surfaces change
- Rollback plan:
  - revert the bounded cache/error-mapping change if it alters normal Linear helper behavior without reducing provider-worker request spend
  - if live verification remains blocked by an exhausted upstream request budget, keep the lane active and record the exact blocker instead of claiming full end-to-end confirmation

## Risks & Mitigations
- Risk: the hourly Linear request budget is already exhausted during this run, so live verification may stay blocked.
  - Mitigation: capture the raw rate-limit response, land focused regressions, and record the blocker explicitly in the workpad and closeout.
- Risk: a run-scoped cache could go stale if another actor mutates the issue between commands.
  - Mitigation: keep the cache bounded to the current run, update it after successful mutations, and fall back to live reads when no trusted cache exists.
- Risk: rate-limit surfacing alone is not enough if transition/upsert still spend an extra read.
  - Mitigation: test both `transition` and `upsert-workpad` against the read-succeeds / write-fails seam explicitly.

## Approvals
- Reviewer: docs-review approved via `/Users/kbediako/Code/CO/.runs/linear-9b2a195b-4603-4ed4-98c6-20eff87049e4/cli/2026-03-28T11-44-12-656Z-a99f3693/manifest.json`
- Date: 2026-03-28
