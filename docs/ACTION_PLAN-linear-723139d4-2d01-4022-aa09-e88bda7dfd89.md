# ACTION_PLAN - Fix Repo-wide Full-Suite npm run test Post-Suite Idling and ProviderIssueHandoff Instability

## Added by Bootstrap 2026-03-28

## Traceability
- Linear issue: `CO-24` / `723139d4-2d01-4022-aa09-e88bda7dfd89`
- Linear URL: https://linear.app/asabeko/issue/CO-24/co-fix-repo-wide-full-suite-npm-run-test-instability-around

## Summary
- Goal: Finish `CO-24` by isolating the surviving full-suite `npm run test` idle path on current `main` and landing the smallest fix or explicit validation contract that restores truthful terminal behavior.
- Scope: docs-first packet, durable reproduction evidence, docs-review, targeted isolation, smallest bounded code/test fix or adopted contract, focused validation, and normal PR/review handoff.
- Assumptions:
  - current truth is narrower than the original CO-14 report: current `main` still reproduces the post-suite idle path even without a fresh `ProviderIssueHandoff` assertion failure in this workspace
  - the most likely owners are lingering servers, timers, or child-process seams that remain alive after late-suite tests

## Milestones & Sequencing
1) Register the CO-24 docs-first packet, mirror the checklist, update `tasks/index.json`, refresh `docs/TASKS.md`, and keep the single Linear workpad current.
2) Run docs-review for `linear-723139d4-2d01-4022-aa09-e88bda7dfd89` before implementation.
3) Narrow the surviving idle path with durable reproduction notes, process snapshots, and focused code-path inspection around late-suite tests and server-owning helpers.
4) Implement the smallest proven fix at the offending seam, or, if elimination is not feasible in-lane, document the explicit repo-owned mitigation contract.
5) Add or update focused regressions to prove the chosen fix or contract.
6) Run the required validation floor, refresh docs/workpad evidence, prepare the PR, and stop coding at `In Review`.

## Dependencies
- `tasks/index.json`
- `docs/TASKS.md`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- late-suite CLI and server-owning tests implicated by reproduction
- `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T052000Z-baseline-reproduction.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npx codex-orchestrator start docs-review --format json --no-interactive --task linear-723139d4-2d01-4022-aa09-e88bda7dfd89`
  - focused reproduction and targeted Vitest commands for the chosen seam
  - `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run pack:smoke` only if downstream-facing CLI/package/review-wrapper surfaces change
- Rollback plan:
  - revert the narrow offending-seam fix if it widens behavior or fails to restore truthful terminal completion
  - if a mitigation contract is adopted instead of a code fix, keep issue ownership active until docs, workpad, and dependent-lane unblock status are explicit and reviewed

## Risks & Mitigations
- Risk: the suite hang is nondeterministic and resists small-scope reproduction.
  - Mitigation: keep durable reproduction notes and use bounded process/handle inspection to narrow the owner incrementally.
- Risk: the apparent provider-handoff link is now only historical, while the live owner sits elsewhere in the late suite.
  - Mitigation: follow the current-main evidence instead of forcing the fix into `ProviderIssueHandoff`.
- Risk: a broad harness rewrite would overrun the lane.
  - Mitigation: adopt an explicit repo-owned validation contract only if a bounded fix is not defensible within the issue scope.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-28
