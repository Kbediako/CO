# ACTION_PLAN - CO: Exclude historical non-provider in_progress manifests from live CO STATUS current activity/runtime

## Added by Bootstrap 2026-04-03

## Summary
- Goal: land the smallest truthful current-source fix so historical non-provider `in_progress` manifests stop appearing as live activity in `CO STATUS` and `/api/v1/state`.
- Scope: docs-first packet, audited docs-review child stream, narrowed runtime source-selection changes in `controlRuntime.ts`, focused tests, live host/API verification, and terminal plus attach-viewer proof embedded in Linear.
- Assumptions:
  - the defect is the null-provider historical-current admission path, not a need to reopen paused snapshot or broader telemetry work
  - the selected run and active claim-backed work remain the only authoritative current sources
  - the current local control-host is already running and can be used for live proof on this device

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `/api/v1/state`, "historical non-provider", "`in_progress` manifests", "authoritative", "running = 0", "terminal proof", and "attach-viewer proof"; reject generic task/run fallback as sufficient current authority and reject text-only or JSON-only proof.
- Not done if:
  - historical null-provider manifests still count as live running activity
  - runtime totals remain inflated from filtered-out rows
  - the focused regression is absent
  - screenshots are not embedded directly in Linear
- Pre-implementation issue-quality review: approved. This lane stays narrower than `CO-67` and is confined to current-running authority plus runtime alignment.

## Milestones & Sequencing
1. Bootstrap the `CO-73` docs-first packet, task registry entries, `.agent` mirror, branch, and the single Linear workpad state.
2. Run the audited child `docs-review` stream and fold back any packet corrections. Status: complete with `clean-success`.
3. Implement the narrowed runtime current-source fix in `controlRuntime.ts`, including the selected `local-mcp` fallback case.
4. Add focused regressions for the historical null-provider running/runtime case and verify the compatibility route reflects the same truth.
5. Run validation, standalone review, and an explicit elegance pass, then capture live terminal and attach-viewer proof and refresh the workpad for handoff.

## Dependencies
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/tests/ControlRuntime.test.ts`
- `orchestrator/tests/ControlServer.test.ts`
- live local control-host under `.runs/local-mcp/cli/control-host/`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-6bed26fd-ea66-43c1-8324-b10871769435 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-73-docs-review --format json`
  - focused Vitest coverage for historical null-provider current-running exclusion and runtime alignment
  - `MCP_RUNNER_TASK_ID=linear-6bed26fd-ea66-43c1-8324-b10871769435 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-6bed26fd-ea66-43c1-8324-b10871769435 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-6bed26fd-ea66-43c1-8324-b10871769435 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-6bed26fd-ea66-43c1-8324-b10871769435 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-6bed26fd-ea66-43c1-8324-b10871769435 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-6bed26fd-ea66-43c1-8324-b10871769435 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-6bed26fd-ea66-43c1-8324-b10871769435 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-6bed26fd-ea66-43c1-8324-b10871769435 node scripts/diff-budget.mjs`
  - `TASK=linear-6bed26fd-ea66-43c1-8324-b10871769435 NOTES="Goal: validate CO-73 current-running authority | Summary: runtime filter and live proof checks | Risks: explicit null-provider boundary regressions" MCP_RUNNER_TASK_ID=linear-6bed26fd-ea66-43c1-8324-b10871769435 FORCE_CODEX_REVIEW=1 npm run review -- --manifest /Users/kbediako/Code/CO/.runs/linear-6bed26fd-ea66-43c1-8324-b10871769435/cli/2026-04-03T01-11-37-563Z-45ca76bc/manifest.json`
  - `MCP_RUNNER_TASK_ID=linear-6bed26fd-ea66-43c1-8324-b10871769435 npm run pack:smoke`
- Rollback plan:
  - revert the source-selection change if it hides a legitimately current selected or claim-backed run
  - capture the exact mismatch and file a narrower follow-up rather than widening this lane

## Risks & Mitigations
- Risk: tightening null-provider admission hides a legitimately current run that lacks provider metadata.
  - Mitigation: preserve selected-run authority and active-claim authority explicitly; add tests around the intended exclusions only.
- Risk: tightening the selected `local-mcp` fallback accidentally hides real current control-host activity.
  - Mitigation: require an active claim only for the null-provider control-host fallback path; keep other selected current runs authoritative.
- Risk: runtime totals continue using stale sources after the running filter changes.
  - Mitigation: assert runtime totals against the same filtered source set in focused tests and live verification.

## Approvals
- Reviewer: docs-review child stream succeeded at `.runs/linear-6bed26fd-ea66-43c1-8324-b10871769435-co-73-docs-review/cli/2026-04-03T01-19-03-347Z-5f8becc5/manifest.json`
- Date: 2026-04-03
