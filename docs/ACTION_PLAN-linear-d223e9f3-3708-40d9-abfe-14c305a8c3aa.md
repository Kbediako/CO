# ACTION_PLAN - CO: Auto-resume or fail explicitly after interrupted Merging-stage merge drain

## Added by Bootstrap 2026-03-30

## Traceability
- Linear issue: `CO-51` / `d223e9f3-3708-40d9-abfe-14c305a8c3aa`
- Linear URL: https://linear.app/asabeko/issue/CO-51/co-auto-resume-or-fail-explicitly-after-interrupted-merging-stage
- Required baseline: `/Users/kbediako/Code/CO/.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1/cli/2026-03-30T07-55-18-395Z-e26e1404/*`

## Summary
- Goal: Repair the narrow `Merging`-continuation seam from the `CO-41` / PR `#324` incident so transient late review noise no longer leaves the issue parked in `Merging` without truthful recovery or operator guidance.
- Scope: docs-first packet, audited docs-review child stream, baseline incident inspection, minimal provider-worker and merge-handoff changes, focused regression coverage, and required validation plus review gates.
- Assumptions:
  - the current failure is a post-handoff continuation seam, not a stale-claim pickup or refresh-lifecycle stall regression
  - the baseline `CO-41` worker manifest, runner log, and Linear audit are sufficient to anchor a deterministic repair and proof story
  - the relevant existing tests live around provider-worker continuation, issue handoff, and merge watch/resolve surfaces

## Milestones & Sequencing
1) Register the `CO-51` docs-first packet, update `tasks/index.json`, refresh `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, mirror the checklist under `.agent/task/`, and keep the single Linear workpad aligned.
2) Run an audited child-stream `docs-review` for `linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa`, then refresh the packet with the manifest-backed approval or explicit wrapper fallback note if the known parse bug recurs.
3) Inspect the required baseline artifacts and the current `providerLinearWorkerRunner.ts` / `providerIssueHandoff.ts` / merge helper seams to identify the narrowest correct retry or explicit-failure contract.
4) Implement the minimal continuation, proof, and audit changes needed to resume after clean-state recovery or emit explicit machine-checkable action-required output.
5) Add focused regression coverage for the interruption-and-recovery sequence, run the required validation floor, and complete standalone review plus elegance review before any handoff.

## Dependencies
- `/Users/kbediako/Code/CO/.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1/cli/2026-03-30T07-55-18-395Z-e26e1404/manifest.json`
- `/Users/kbediako/Code/CO/.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1/cli/2026-03-30T07-55-18-395Z-e26e1404/runner.ndjson`
- `/Users/kbediako/Code/CO/.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1/cli/2026-03-30T07-55-18-395Z-e26e1404/provider-linear-worker-linear-audit.jsonl`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/tests/LinearCliShell.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `tests/pr-watch-merge.spec.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --issue-id d223e9f3-3708-40d9-abfe-14c305a8c3aa --format json`
  - focused vitest coverage for provider-worker and merge interruption recovery
  - `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run build`
  - `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run test`
  - `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run pack:smoke` only if the final diff touches downstream-facing CLI/package/review-wrapper surfaces
- Rollback plan:
  - revert the retry/resume behavior if it can duplicate merge attempts or misclassify genuinely blocked PRs as retryable
  - keep the explicit action-required artifact path even if full automatic resume is too risky for this lane

## Risks & Mitigations
- Risk: the worker may keep retrying a noisy PR indefinitely.
  - Mitigation: bound retries around a clean mergeable-state predicate and emit explicit action-required output when the predicate does not stabilize.
- Risk: operator artifacts could stay ambiguous even after the retry logic changes.
  - Mitigation: record lifecycle phases explicitly in proof and Linear audit outputs, not only in console logs.
- Risk: the repair could overlap with existing merge helper semantics and create duplicate merge attempts.
  - Mitigation: reuse the existing merge helper contract and only re-arm after a new clean-state observation.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-30
