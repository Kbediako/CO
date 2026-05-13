# ACTION_PLAN - linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad

## Summary
- Goal: eliminate the manual `In Review` / `Human Review` -> `Merging` workflow hop for provider-owned issues by adding a truthful promotion bridge with explicit blocker reporting.
- Scope: docs-first packet, audited docs-review child stream, bounded handoff/promotion orchestration changes, persisted proof updates, focused regressions, and the normal validation/review handoff flow.
- Assumptions:
  - the existing same-repo attached-PR selector and `pr-watch-merge` readiness logic are the right truth sources for this bridge
  - persisted provider claim or observability artifacts are the correct place to record promotion or blocker truth

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `In Review`, `Human Review`, `Merging`, `providerIssueHandoff.ts`, `providerMergeCloseout.ts`, `mergeStateStatus`, `required checks`, `review threads`, and truthful blocker reporting.
- Not done if: provider-owned review handoffs still need manual operator promotion, or blocked promotion attempts still leave no concrete reason in auditable artifacts.
- Pre-implementation issue-quality review: approved. The bounded seam is review-handoff promotion and proof surfacing, not launchd, dispatch, or broader merge-closeout redesign.

## Milestones & Sequencing
1. Create the CO-116 docs packet, checklist mirrors, local workpad source, and registry entries, then upsert the single workpad comment.
2. Run audited `linear child-stream --pipeline docs-review`, record the manifest, and resolve any blocking spec ambiguity before code.
3. Add a dedicated review-handoff promotion record and reuse the existing attached-PR selection plus merge-mode PR snapshot logic to decide promotion or blocker truth.
4. Integrate the promotion path into provider issue handoff while keeping ordinary `Merging` merge closeout unchanged.
5. Add focused regressions for promotion success, refusal reasons, and proof/observability output as needed.
6. Run the required validation floor, standalone review, explicit elegance review, and workpad refresh before any PR or review handoff.

## Dependencies
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerMergeCloseout.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/src/cli/control/providerIssueObservability.ts`
- `scripts/lib/pr-watch-merge.js`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ProviderMergeCloseout.test.ts`
- `orchestrator/tests/ProviderIssueObservability.test.ts` if observability changes are needed

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-116-docs-review --format json`
  - focused regressions for review-handoff promotion success and refusal paths
  - required repo validation floor after implementation
  - manifest-backed standalone review and explicit elegance review before handoff
- Rollback plan:
  - revert the review-promotion record and handoff integration together so review-handoff claims return to the pre-CO-116 behavior without partial proof drift

## Risks & Mitigations
- Risk: a new promotion classifier diverges from existing merge-closeout truth.
  - Mitigation: reuse the existing attached-PR selector and merge-mode PR snapshot/blocker mapper instead of copying logic.
- Risk: promotion proof exists only in transient logs and not operator-facing artifacts.
  - Mitigation: persist a dedicated review-promotion record on the claim and reflect it through provider observability.
- Risk: touching the handoff seam unintentionally changes ordinary `Merging` behavior.
  - Mitigation: keep merge-closeout semantics unchanged once the issue is already `Merging`, and prove that with focused tests.
- Risk: `REVIEW_REQUIRED` ambiguity could move issues into `Merging` before human review is actually complete.
  - Mitigation: treat full merge-mode readiness as the bridge contract, so `review=REVIEW_REQUIRED` is persisted as refusal truth instead of being ignored.

## Approvals
- Reviewer: `docs-review` child stream recorded at `.runs/linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad-co-116-docs-review/cli/2026-04-09T02-47-50-041Z-2edb5399/manifest.json`; follow-up implementation review still required after code changes.
- Date: 2026-04-09
