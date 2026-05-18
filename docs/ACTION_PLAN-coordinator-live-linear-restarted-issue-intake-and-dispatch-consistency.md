# ACTION_PLAN - Coordinator Live Linear Restarted-Issue Intake and Dispatch Consistency

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: close the verified stale dispatch identifier leak while recording that the reported persisted-intake replay symptom is not currently reproduced on merged `main`.
- Scope: docs-first registration, live evidence audit, dispatch code-path audit, smallest dispatch fix, validation, live retest, PR, feedback, and merge.
- Assumptions:
  - the current control host in tmux session `co-control-host` stays available
  - setup state remains valid and does not need to be recreated
  - current merged runtime may already have converged, so implementation is conditional

## Milestones & Sequencing
1. Register `1317`, capture current live evidence, and complete docs-review before implementation.
2. Compare the historical handoff symptom against the current persisted state plus authenticated `/api/v1/dispatch`, then complete the read-only code-path audit.
3. Apply the dispatch-only decision:
   - persisted-intake replay not currently reproduced: do not invent a provider fix
   - stale dispatch fallback remains: patch the narrowest response-shaping surface, validate, redeploy or restart the local control host only when the fix is ready, rerun live verification, PR, feedback loop, and merge
4. Use the live restart proof to decide whether another operator action is necessary. For `1317`, the restarted host already rehydrated `CO-1`, so no final operator flip is needed.

## Dependencies
- Current live files under `.runs/local-mcp/cli/control-host/`
- Live `CO-1` run manifests under `.runs/linear-8c4a8de9-45b2-40ef-b295-bd37a21d1155/cli/`
- Dispatch/read-model code paths under `orchestrator/src/cli/control/`

## Validation
- Checks / tests:
  - docs-first gates and docs-review first
  - if code changes are needed, run the full requested validation floor
  - if downstream-facing dispatch/read surfaces are touched, include `npm run pack:smoke`
- Rollback plan:
  - do not patch provider-intake behavior unless a current replay failure is re-proven
  - if the dispatch patch widens provider boundaries or fails live verification, revert to evidence-only closure and stop

## Risks & Mitigations
- Risk: patching a stale symptom that is already resolved on current `main`.
  - Mitigation: require current live reproduction or code-path proof before editing implementation files.
- Risk: conflating intake-state lag with dispatch shaping lag.
  - Mitigation: keep separate evidence streams and require a precise classification before patching.

## Approvals
- Reviewer: `docs-review` succeeded for `1317` at `.runs/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/cli/2026-03-22T04-14-00-475Z-008b6375/manifest.json`.
- Date: 2026-03-22
