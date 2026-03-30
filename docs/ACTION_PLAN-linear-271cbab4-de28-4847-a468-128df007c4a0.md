# ACTION_PLAN - CO: Implement parent-owned same-issue multi-worker runtime end to end

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-35` / `271cbab4-de28-4847-a468-128df007c4a0`
- Linear URL: https://linear.app/asabeko/issue/CO-35/co-implement-parent-owned-same-issue-multi-worker-runtime-end-to-end

## Summary
- Goal: finish `CO-35` by landing the first real parent-owned same-issue multi-worker runtime slice under `provider-linear-worker`, including scope ownership, stale invalidation, parent-only mutation enforcement, nested observability, and real runtime proof.
- Scope: docs-first packet, audited docs-review child stream, child-lane launcher and runner, parent-only Linear guard, parent proof and observability updates, focused regressions, runtime proof capture, and the required validation or review handoff flow.
- Assumptions:
  - current bounded `child-stream` support is the correct substrate to extend, but it is not sufficient on its own because it only handles docs/review or advisory pipelines
  - the first slice can fail overlapping scopes closed rather than introducing queueing
  - explicit patch-artifact acceptance by the parent is the safest integration seam for the first runtime slice

## Milestones & Sequencing
1. Register the `CO-35` docs-first packet, task registry entry, task snapshot, and docs freshness entries.
2. Launch an audited `docs-review` child stream now that the packet exists and record the manifest directly if the wrapper again prepends logs and returns parse-invalid output.
3. Audit the current `CO-13` child-stream contract, parent proof path, provider-run discovery, workspace utilities, and presenter surfaces; record the narrowed implementation boundary in the task spec notes.
4. Implement the same-issue child-lane helper and runtime pipeline with declared purpose, explicit scope, lineage, lane-local workspace, and patch-artifact output.
5. Add parent-only Linear mutation enforcement and the parent decision flow for accept, reject, invalidate, and rerun.
6. Widen parent proof and read-side observability to surface nested `child_lanes` while keeping subordinate manifests hidden from peer-owner discovery.
7. Add focused regressions for lineage, mutation ownership, scope conflict, stale invalidation, proof hydration, and observability rendering.
8. Use the current `CO-35` lane to launch more than one subordinate child lane, record runtime proof artifacts, run the required validation floor plus standalone or elegance review, then refresh the workpad for handoff.

## Dependencies
- `codex.orchestrator.json`
- `orchestrator/src/cli/linearCliShell.ts`
- `orchestrator/src/cli/providerLinearChildStreamShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
- `orchestrator/src/cli/run/workspacePath.ts`
- `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/LinearCliShell.test.ts`
- `orchestrator/tests/SelectedRunPresenter.test.ts`
- `orchestrator/tests/ControlStatusDashboard.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-35-docs-review --format json`
  - focused child-lane and provider runtime regression command(s)
  - `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run pack:smoke` because the lane changes downstream-facing CLI and workflow surfaces
- Rollback plan:
  - remove the new child-lane pipeline and helper if parent-only truth or scope isolation is incorrect
  - keep the issue active until real runtime proof shows nested lane behavior is truthful end to end

## Risks & Mitigations
- Risk: lane-local worktrees created under the parent workspace boundary produce confusing nested repo behavior.
  - Mitigation: keep child-lane workspaces under a dedicated hidden directory, store patch artifacts explicitly, and keep parent acceptance manual.
- Risk: subordinate lanes can still call Linear mutation helpers directly.
  - Mitigation: reject mutating helper subcommands whenever the current manifest identifies a subordinate same-issue lane.
- Risk: stale invalidation is too weak and allows outdated patches onto the parent workspace.
  - Mitigation: snapshot parent `HEAD` and issue freshness at launch and refuse acceptance once either changes incompatibly.
- Risk: observability shows child manifests as peer owners.
  - Mitigation: keep provider discovery filtering pipeline plus lineage based and add targeted regressions.

## Approvals
- Reviewer: Pending docs-review and implementation validation
- Date: 2026-03-30
