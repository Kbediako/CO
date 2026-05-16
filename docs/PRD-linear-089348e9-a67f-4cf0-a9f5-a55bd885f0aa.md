# PRD - CO-516 reconcile provider-intake terminal merge closeout truth

## Traceability
- Linear issue: `CO-516` / `089348e9-a67f-4cf0-a9f5-a55bd885f0aa`
- Linear URL: https://linear.app/asabeko/issue/CO-516/co-reconcile-provider-intake-terminal-claims-after-merge-closeout
- Task registry id: `20260516-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa`
- MCP Task ID: `linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa`
- Source evidence: parent-provided CO-516 contract plus current-main source inspection on 2026-05-16.

## Summary
- Problem Statement: after a provider-worker PR merges and Linear reaches a terminal `Done` state, retained provider-intake claims can keep stale review-handoff or merge-closeout fields and stale issue metadata. Observed shapes include a `completed` claim still carrying cached `Merging` merge-closeout truth after PR merge plus Linear `Done`, and a `released` claim retaining stale `Blocked` metadata after the same terminal closeout.
- Desired Outcome: terminal merged/Done closeout is reconciled into non-active provider-intake truth while preserving audit history, so status projections and active non-release alarms do not treat stale review or merge metadata as current operator work.

## User Request Translation
- User intent / needs: repair the provider-intake/control-host read model so CO-513/CO-510-style terminal merge closeout residue is downgraded or explicitly excluded after the PR is merged and Linear is terminal.
- Success criteria / acceptance:
  - Promoted review-handoff and merge-closeout claims are reconciled when live issue truth says the PR merged and Linear is terminal.
  - Retained audit history stays available through `review_promotion` / `merge_closeout` records and source-labeled terminal evidence.
  - Terminal `completed` claims are converted to released/non-active hygiene state or excluded from active non-release alarms.
  - Terminal `released` claims refresh stale issue metadata from terminal truth without becoming active.
  - Regression coverage includes an In Review -> Merging -> Done closeout shape matching CO-492 / PR #793 lineage.
- Constraints / non-goals:
  - No manual `provider-intake-state.json` cleanup.
  - No review/merge policy changes.
  - No `goal_evidence` lifecycle authority changes.
  - No broad manifest serialization work; CO-514 owns that.
  - No Linear/GitHub mutations from this manual replacement worker.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `provider-intake terminal claims`
  - `merge closeout`
  - `CO-513 retained as completed with cached Merging state after PR #816 merged and Linear Done`
  - `CO-510 released with stale Blocked metadata after PR #817 merged and Linear Done`
  - `CO-492/#793 style In Review -> Merging -> Done closeout`
  - `preserve audit history`
  - `active non-release alarms`
- Protected terms / exact artifact and surface names:
  - `provider-intake-state.json`
  - `review_promotion`
  - `merge_closeout`
  - `provider_issue_merge_closeout_merged`
  - `provider_issue_released:not_active`
  - `selected-run`
  - `co-status`
  - `ProviderIssueHandoff`
  - `ProviderIntakeState`
- Nearby wrong interpretations to reject:
  - deleting retained claims or editing live control-host artifacts by hand
  - hiding every warning for released/completed claims regardless of source evidence
  - changing merge readiness, PR review, or Done transition policy
  - treating stale cached metadata as equivalent to live terminal Linear truth
  - adding a manifest serialization overhaul in this lane

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Completed merge-closeout claim | A `completed` claim can keep `issue_state=Merging` and `merge_closeout` after the PR merged and Linear is already `Done`. | Terminal Linear truth should make the provider claim non-active while keeping merge audit details. | Claim no longer appears as active non-release closeout work; terminal evidence is source-labeled and audit fields remain inspectable. | Changing merge closeout policy or re-running PR operations. |
| Released stale metadata | A `released` claim can retain stale non-terminal metadata such as `Blocked` after a terminal merged/Done closeout. | Live terminal issue metadata should supersede stale retained metadata when available. | Released/non-active row refreshes to terminal issue metadata and stays non-active. | Manual state-file cleanup or issue-specific CO-510 branching. |
| Status / selected-run projection | Stale claim metadata can leak into operator surfaces as current closeout state. | Operator surfaces should separate historical terminal evidence from active alarms. | Terminal merged/Done evidence is visible without counting as active non-release alarm work. | Dashboard redesign or broad manifest serialization changes. |

## Not Done If
- A merged PR plus terminal Linear `Done` still leaves a `completed` provider-intake claim selected as active closeout work because it carries cached `Merging` metadata.
- A `released` claim with terminal closeout evidence still reports stale non-terminal `issue_state`, `issue_state_type`, or `issue_updated_at`.
- The fix deletes audit history instead of preserving source-labeled `review_promotion` / `merge_closeout` evidence.
- The fix suppresses warnings broadly without proving merged PR and terminal Linear evidence.
- The implementation mutates live provider-intake artifacts, Linear, GitHub, `goal_evidence`, or manifest serialization contracts.

## Goals
- Reconcile terminal merged/Done closeout truth into retained provider-intake claims.
- Preserve audit history while removing stale active/non-release alarm authority.
- Add focused regression coverage for review handoff -> merge closeout -> Done terminal lifecycle.
- Keep implementation bounded to provider-intake/control-host projection and reconciliation logic.

## Non-Goals
- No manual control-host state cleanup.
- No PR review/merge policy changes.
- No Linear/GitHub lifecycle mutations from this worker.
- No `goal_evidence` lifecycle authority work.
- No broad manifest serialization changes.
- No dispatch pilot config changes.

## Stakeholders
- Product: CO operators watching provider lanes, queue state, and closeout alarms.
- Engineering: provider-intake, control-host, and status projection maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - Focused regression fails before the implementation and passes after.
  - Terminal merged/Done claims are non-active or terminal-labeled in summaries.
  - Stale `Blocked` / `Merging` metadata is refreshed when terminal live truth is available.
  - Audit records remain present in retained claims.
- Guardrails / Error Budgets:
  - zero manual `provider-intake-state.json` edits
  - zero Linear/GitHub mutations in this worker
  - zero broad warning suppression without terminal source evidence

## Technical Considerations
- Architectural Notes:
  - The likely seam is provider-intake claim refresh/reconciliation plus status/selected-run classification, not merge policy.
  - Existing `merge_closeout` and `review_promotion` records should remain as historical evidence while claim state/reason/issue metadata reflect terminal truth.
  - Regression coverage should use existing provider handoff and projection helpers where possible.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - selected-run/status projection code if active alarm classification needs adjustment
  - focused provider issue handoff/control-host tests

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- `remove fallback`: cached non-terminal merge-closeout or issue metadata must stop acting as current authority once merged PR plus terminal Linear truth is available.
- `justify retaining fallback`: retained provider-intake audit rows remain supported historical evidence after terminal closeout.
- Large-refactor check: a larger provider-intake authority refactor remains desirable for the wider fallback family, but this lane is allowed as a bounded fix because it removes stale terminal authority without adding a new launch path or broad manifest contract.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Terminal closeout metadata | Cached `Merging` / stale non-terminal issue fields survive after merged PR plus Linear `Done`. | `remove fallback` | CO-516 | Live terminal issue truth is available for a claim with merged closeout evidence. | Existing provider closeout behavior | 2026-05-16 | This issue | Claim state/summary no longer treats cached non-terminal closeout metadata as active authority. | Focused provider-intake closeout regression. |
| Retained closeout audit row | Historical `review_promotion` / `merge_closeout` evidence remains on non-active claims. | `justify retaining fallback` | Provider-intake control-host | Claim has terminal closeout history after PR merge/Done. | Existing provider-intake retention behavior | 2026-05-16 | Durable audit contract | Separate archival policy replaces retained provider-intake audit rows. | Regression asserts audit fields remain present while active counts exclude the claim. |

- Contract name: provider-intake terminal closeout audit retention.
- Owning surface: provider-intake control-host claim retention and projection.
- Steady-state proof: terminal source evidence is visible, but retained rows are not active work authority.
- Tests/docs: CO-516 packet plus focused provider handoff/projection regressions.
- Non-expiring rationale: retaining historical closeout evidence is an audit requirement, not temporary compatibility debt.

## Open Questions
- Whether the smallest source change belongs entirely in provider-intake claim reconciliation or also needs selected-run/status projection classification will be decided from focused failing tests.

## Approvals
- Product: parent-provided CO-516 issue contract.
- Engineering: pre-implementation issue-quality review in this packet on 2026-05-16.
- Design: N/A.
