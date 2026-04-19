# PRD: CO-265 merge closeout closed-unmerged PR attachment disambiguation

## Traceability

- Linear issue: `CO-265`
- Issue title: `Merge closeout: ignore closed prior-attempt PR attachments`
- Task id: `linear-7988e9a6-8258-4cff-b585-fadc31741ce1`
- Registry id: `20260420-linear-7988e9a6-8258-4cff-b585-fadc31741ce1`
- Phase: docs-first packet only
- Parent-owned implementation surface: `orchestrator/src/cli/control/providerMergeCloseout.ts`
- Source anchor: `ctx:sha256:66e32cdd7a1c41a0c9b4a4929c72b4ad9bfddfd4107c5f4520b27cb2192a2678#chunk:c000001`
- Declared source payload: `.runs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1-docs-packet-r2/cli/2026-04-19T20-14-50-934Z-8d384eca/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1-docs-packet-r2/cli/2026-04-19T20-14-50-934Z-8d384eca/manifest.json`
- Source caveat: the r2 source payload available to this lane carries run metadata plus issue id, identifier, and updated_at only. This packet preserves the same-issue CO-265 issue wording from parent evidence and current repo seams found in `providerMergeCloseout.ts`; no Linear mutation was performed.

## User Request Translation

Make merge closeout apply the same deterministic stale closed-unmerged prior-attempt PR attachment filtering that review promotion already uses. In the cited `CO-220` case, the current ready PR was `PR #560`, while stale closed prior-attempt `PR #516` remained attached to the Linear issue. Review promotion correctly selected current `PR #560`, but `merge_closeout` later treated both attachments as current same-repo conflicts, set `reason=multiple_attached_prs`, and left the issue in `handoff_failed` / `provider_issue_merge_closeout_action_required` until an operator manually deleted the stale Linear attachment.

The product requirement is not attachment cleanup. The requirement is deterministic merge-closeout disambiguation: when exactly one current ready PR remains after ignoring closed-unmerged retired-attempt attachments, merge closeout should select that PR, record which stale URLs were ignored, and continue through the existing readiness and merge gates.

## Problem Statement

`providerMergeCloseout.ts` has separate review and merge-closeout behavior. The issue diagnosis says closed-unmerged PR attachments are ignored in `review_promotion` mode, but not in `merge_closeout` mode. That makes the later closeout path stricter than the earlier promotion path even after the current PR has already passed review readiness.

The bad outcome is a manual bottleneck after machine-checkable readiness has already been established. Operators should not have to delete Linear attachments to make a current ready PR proceed, and stale attachment history should remain auditable instead of being erased.

## Desired Outcome

- `merge_closeout` deterministically ignores closed-unmerged retired-attempt PR attachments when one current ready PR remains.
- `merge_closeout` records ignored stale URLs in audit/projection evidence using `ignored_closed_unmerged_pr_urls`.
- `merge_closeout` still fails closed for multiple current/open PR attachments and records `conflicting_attached_pr_urls`.
- `multiple_attached_prs` remains the correct reason for real ambiguity after stale closed-unmerged attachments are filtered out.
- Existing merge readiness gates remain intact: required checks, CodeRabbit/Codex review, unresolved threads, mergeability, draft/do-not-merge labels, and head-SHA guards are not weakened.
- Historical Linear attachments remain in place; the implementation must not require attachment deletion.

## Issue-Quality Review

The issue is sufficiently specific for implementation. It names the exact owning file, relevant modes, audit fields, reason strings, source issue, current PR, stale PR, expected behavior, wrong interpretations, non-goals, and not-done conditions. The likely implementation seam is narrow: reuse or align the existing `review_promotion` closed-unmerged filtering behavior for `merge_closeout` and ensure ignored stale URLs are surfaced in the merge closeout record/projection.

This packet rejects a narrower interpretation that only adds diagnostics without changing selection, and rejects a wider interpretation that manages all GitHub or Linear attachment lifecycle behavior. The source issue is about same-repo PR attachment disambiguation during merge closeout.

## Protected Terms

These terms and surfaces are protected issue wording and must remain exact in implementation, review notes, and closeout evidence:

- `providerMergeCloseout.ts`
- `merge_closeout`
- `review_promotion`
- `ignored_closed_unmerged_pr_urls`
- `conflicting_attached_pr_urls`
- `multiple_attached_prs`
- stale closed-unmerged prior-attempt PR attachment
- current ready PR
- Linear attachments
- `CO-220`
- `PR #560`
- `PR #516`
- `merge-closeout-closed-unmerged-pr-attachment-disambiguation`
- `codex-orchestrator:canonical-owner-key=merge-closeout-closed-unmerged-pr-attachment-disambiguation`

## Wrong Interpretations To Reject

- Do not delete historical attachments as the implementation strategy.
- Do not ignore multiple current/open PRs.
- Do not hide stale attachment evidence from audit output.
- Do not broaden to generic GitHub attachment cleanup or all Linear attachment lifecycle management.
- Do not weaken merge readiness checks, required checks, unresolved thread checks, or head-SHA guards.
- Do not make `review_promotion` less strict to match the current `merge_closeout` bug.
- Do not treat unknown PR state as safely ignorable.

## Non-Goals

- No automatic deletion of Linear attachments.
- No change to review promotion behavior except shared/refactored filtering if needed.
- No bypass of merge readiness, CodeRabbit/Codex review, unresolved thread, mergeability, or required-check gates.
- No broad rewrite of provider intake, PR attachment hydration, or GitHub GraphQL snapshotting.
- No changes to unrelated stale issue projection bugs.
- No changes to implementation or tests in this docs child lane.

## Current / Reference / Target Parity Matrix

| Surface | Current Behavior | Reference Behavior | Target Behavior |
| --- | --- | --- | --- |
| `review_promotion` attachment selection | Diagnosis says it ignores stale closed-unmerged prior-attempt `PR #516` and selects current `PR #560`. | This is the known-good behavior for closed-unmerged retired-attempt filtering. | Preserve this behavior, or share the filtering helper without weakening it. |
| `merge_closeout` attachment selection | Treats current `PR #560` and stale closed `PR #516` as conflicting same-repo attachments. | Should align with `review_promotion` once the stale attachment is known closed-unmerged. | Ignore stale closed-unmerged prior-attempt PR attachments when exactly one current ready PR remains. |
| Audit/projection evidence | Current issue evidence showed `reason=multiple_attached_prs` and `conflicting_attached_pr_urls` with both URLs. | Review promotion already exposes stale ignored evidence through `ignored_closed_unmerged_pr_urls`. | Merge closeout records `ignored_closed_unmerged_pr_urls` and still records `conflicting_attached_pr_urls` for real current conflicts. |
| Real ambiguity | Multiple attached PRs can block merge closeout. | Review selection must not silently pick among multiple current candidates. | Keep `multiple_attached_prs` for multiple current/open PRs after filtering. |
| Readiness gates | Merge closeout has checks for readiness and merge safety. | Existing merge safety is authoritative. | Do not bypass required checks, unresolved threads, mergeability, draft/do-not-merge, or head-SHA guards. |
| Linear attachment lifecycle | Operators manually removed stale attachment to unblock `CO-220`. | Attachments are historical evidence. | Never require deleting Linear attachments to close out the current ready PR. |

## Acceptance Criteria

- Reproduce the `CO-220` shape: current open ready PR plus stale closed-unmerged prior-attempt PR attachment on the same Linear issue.
- Merge closeout ignores closed-unmerged retired-attempt PR attachments when exactly one current ready PR remains.
- Merge closeout records ignored stale closed-unmerged PR URLs in audit/projection evidence, parallel to review promotion evidence.
- Merge closeout still fails closed for multiple open/current PR candidates and for normal readiness blockers.
- Add regression coverage for merge closeout attachment disambiguation and preserve existing review promotion behavior.
- No implementation path requires deleting Linear attachments to complete the current PR closeout.

## Not Done If

- A closed-unmerged prior-attempt PR attachment can still block merge closeout when exactly one current ready PR is attached.
- Multiple open/current PR attachments are silently ignored or auto-selected without deterministic evidence.
- The ignored stale PR URLs are not recorded in merge closeout audit/projection evidence.
- The fix requires operators to manually delete stale Linear PR attachments.
- Real conflicting current PRs, failed checks, unresolved threads, draft/do-not-merge labels, or dirty merge states can be bypassed.
