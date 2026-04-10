# ACTION_PLAN - linear-da009c42-d0fc-4834-be72-f977a778693c

## Summary
- Goal: recover truthful late-turn active-claim handoff when repeated control-host refresh requests time out under live PR completion pressure.
- Scope: docs-first packet, single workpad upkeep, audited docs-review child stream, bounded refresh acknowledgement fix, focused regressions, and the normal validation/review handoff flow.
- Assumptions:
  - the late seam is the refresh acknowledgement contract, not a still-live terminally wedged `CO-102` state
  - existing attached-PR disambiguation from `CO-104` remains the right truth source for historical attachments

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `provider-linear-worker`, `control-host refresh`, `provider_poll_lifecycle_stuck`, `In Progress`, stale historical attached PRs, and the late-turn live PR completion pressure framing.
- Not done if: busy-but-healthy queued refresh work can still look like a refresh failure to the provider worker, or a green PR can still leave a live issue pinned in `In Progress`.
- Pre-implementation issue-quality review: approved. The bounded seam is refresh acknowledgement and recovery truth, not generic workflow automation, closeout redesign, or dashboard fidelity.

## Milestones & Sequencing
1. Create the CO-119 docs packet, checklist mirrors, and source-controlled workpad; upsert the single Linear workpad comment.
2. Run audited `linear child-stream --pipeline docs-review`, record the manifest, and resolve any spec ambiguity before code.
3. Change the control-host/public refresh acknowledgement contract so queued/coalesced work returns prompt accepted truth while preserving genuine stuck failures.
4. Adjust provider-worker and late-turn recovery handling only as needed to consume the new acknowledgement semantics without broad workflow changes.
5. Add focused regressions for queued/coalesced refresh acceptance, actual stuck truth, and the archived late-turn recovery shape.
6. Run the required validation floor, standalone review, explicit elegance review, and workpad refresh before any PR or review handoff.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerPollingHealth.ts`
- `orchestrator/tests/ControlServerPublicLifecycle.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts` if claim routing assertions change
- `orchestrator/tests/ProviderPollingHealth.test.ts` if stuck semantics change

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-da009c42-d0fc-4834-be72-f977a778693c node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-119-docs-review --format json`
  - focused regressions for queued/coalesced refresh acknowledgement and late-turn recovery
  - required repo validation floor after implementation
  - manifest-backed standalone review and explicit elegance review before handoff
- Rollback plan:
  - revert the caller-facing refresh acknowledgement change and any provider-worker handling updates together so refresh requests return to the pre-CO-119 behavior without mixed semantics

## Risks & Mitigations
- Risk: a fix that only raises the timeout hides genuine unresponsive refresh requests.
  - Mitigation: prefer immediate accepted/queued/coalesced truth at the control-host boundary and keep actual unresponsive requests failing.
- Risk: a queued/coalesced acknowledgement could mask genuine stuck lifecycle states.
  - Mitigation: preserve the existing stuck/restart-required classifier and fail closed when the active lifecycle is actually stuck.
- Risk: late-turn recovery work accidentally reopens historical attached-PR or review-handoff policy lanes.
  - Mitigation: keep attached-PR handling on the existing `CO-104` selector and leave review-to-`Merging` behavior to `CO-116`.

## Approvals
- Reviewer: `docs-review` child stream completed clean-success at `.runs/linear-da009c42-d0fc-4834-be72-f977a778693c-co-119-docs-review/cli/2026-04-09T08-34-19-507Z-042c1cf5/manifest.json`; its one concrete packet issue was the archived-run path location and that was corrected before implementation. Later implementation review still required.
- Date: 2026-04-09
