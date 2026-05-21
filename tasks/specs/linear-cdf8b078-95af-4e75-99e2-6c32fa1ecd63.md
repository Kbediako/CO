---
id: 20260520-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63
title: CO-571 released terminal claim reconciliation restart loop
relates_to: docs/PRD-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md
risk: high
owners:
  - Codex
last_review: 2026-05-21
related_action_plan: docs/ACTION_PLAN-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md
task_checklists:
  - tasks/tasks-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md
---

# TECH_SPEC - CO-571 released terminal claim reconciliation restart loop

## Canonical Reference
- Linear issue: `CO-571` / `cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- PRD: `docs/PRD-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- Task checklist: `tasks/tasks-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- Agent task mirror: `.agent/task/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- Registry: `tasks/index.json`
- Task snapshot: `docs/TASKS.md`
- Freshness registry: `docs/docs-freshness-registry.json`
- Canonical owner key: `control-host:released-claim-reconcile-restart-loop`

## Summary
- Objective: repair provider refresh lifecycle classification so retained released terminal historical claims, parked Backlog released `not_active` claims, and stale retained merged-closeout history do not drive `provider_refresh_lifecycle_stuck` / `restart_required` when WIP is `0/3` and no active run/retry/worker corroboration exists.
- Scope:
  - released terminal historical claims in provider-intake/reconciliation state
  - `refresh:claim_issue_by_id_reconcile` / `claim_issue_by_id:released`
  - `refresh:claim_reconcile` / `claim_reconcile:released`
  - terminal Done claims CO-472, CO-461, CO-451, and CO-468
  - terminal Duplicate/canceled claims CO-469 and CO-476
  - terminal Done claim CO-471 with `retrying=1` projection mismatch despite null retry metadata
  - no-current-poll-snapshot reconciliation when `resolveTrackedIssues` skips or is unavailable
  - current-poll terminal snapshot reconciliation when `resolveTrackedIssues` reconfirms the same terminal `not_active` issue
  - map-missing current-poll reconciliation when completed/canceled Linear issues are filtered out of the current issue map
  - CO-529-style Backlog/backlog released `not_active` direct issue-by-id recurrence
  - CO-521/CO-524-style Backlog/backlog released `not_active` direct issue-by-id recurrence when the current poll snapshot is unavailable
  - CO-522-style retained `review_promotion` / `merge_closeout` recurrence after PR #795 merged and live Linear truth advanced to Done/completed
  - stale `review_promotion` metadata on retained released claims
  - active stuck refresh behavior that must still fail closed
- Constraints:
  - no timeout-only fix
  - no fabricated coherent snapshot
  - no provider-intake manual edits
  - no deletion of historical released claim audit evidence
  - no weakening of genuine `provider_refresh_lifecycle_stuck` / `restart_required` signals

## Issue-Shaping Contract
- User-request translation carried forward:
  - fix the reconciliation/classification authority, not the symptoms
  - terminal released historical claims are not active WIP when run and retry fields are null and live issue state is terminal
  - parked Backlog released `not_active` rows are not active WIP when run and retry fields are null and there is no promotion, merge-closeout, or cancelable retained-run evidence
  - Done and Duplicate/canceled terminal released claims belong to the same inactive historical family
  - status surfaces stay truthful for both terminal benign claims and real active stalls
- Protected terms / exact artifact and surface names:
  - `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `refresh:claim_issue_by_id_reconcile`
  - `claim_issue_by_id:released`
  - `refresh:claim_reconcile`
  - `claim_reconcile:released`
  - released terminal historical claims
  - CO-472
  - CO-461
  - CO-469
  - CO-471
  - CO-476
  - CO-451
  - CO-468
  - no active workers/WIP 0/3
  - `retrying=1` projection mismatch
  - no fabricated coherent snapshot
  - no provider-intake manual edits
  - `provider-intake-state.json`
  - `co-status --format json`
  - `/ui/data.json`
  - current-poll terminal snapshot
  - CO-482
  - CO-478
  - CO-480
  - `linear:3abba033-52f0-45f3-af58-cce4939f087f`
  - map-missing current poll terminal history
  - CO-529
  - `linear:2807d702-edce-4847-84d3-ca8628ab77fc`
  - CO-521
  - `linear:9749edb3-51e3-45e3-935b-8333dafafca5`
  - CO-524
  - `linear:0d975e30-67a5-4ea4-992a-61576c89d913`
  - Backlog/backlog released `not_active`
  - CO-522
  - `linear:b642e879-ba50-45ef-b0d9-b059afa9e932`
  - retained `review_promotion`
  - retained `merge_closeout`
  - PR #795 merged
  - live Linear Done/completed
- Nearby wrong interpretations to reject:
  - treating endpoint timeouts as healthy
  - clearing restart-required state for real active stalls
  - deleting historical claims from provider intake
  - relying on an operator restart
  - broadening into quota hygiene, admission capacity, or all freshness-gauge behavior
- Explicit non-goals carried forward:
  - no manual provider-intake repair
  - no timeout bump as the fix
  - no disabling workers or oversight
  - no unrelated queue-capacity or quota work

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `claim_issue_by_id:released` | CO-472 Done and CO-469 Duplicate/canceled can be present as released historical claims. | Terminal released claims without active run/retry/worker evidence are inactive history. | They do not drive `restart_required`; they remain audit-visible. | Removing provider-intake history. |
| `claim_reconcile:released` | CO-461 Done can be present as released historical claim reconciliation. | Terminal released claim reconciliation should not be active work. | It does not drive `restart_required` without active corroboration. | Skipping all reconciliation. |
| Retry projection | CO-471 Done can be selected as `claim_reconcile:released` while the status count reports `retrying=1` even though selected claim retry fields are null. | Terminal released claims with null retry metadata should not themselves count as retrying work. | Selected released terminal claims are excluded from retrying projection unless separate active retry evidence exists. | Hiding separate real retrying claims. |
| Active refresh stalls | Active claims can still stall during refresh. | Active stalls must fail closed with provider keys and phase evidence. | Active stuck path still emits `provider_refresh_lifecycle_stuck` and `restart_required`. | Treating all refresh stalls as benign. |
| Status truth | `/ui/data.json` and `co-status --format json` can expose unhealthy or timeout states. | Operators need truthful, not fabricated, state. | Terminal released claim filtering does not fabricate healthy snapshots. | Status UI redesign. |
| No current poll snapshot | After PR #855 merged, skipped/unavailable tracked-issue polling left `trackedIssuesByKey=null`, then the no-map resolver entered `claim_issue_by_id:released` direct issue-by-id reads for terminal history. | The classification authority must not depend on a bulk poll map when the cached row is already a strong terminal released historical claim. | Strong terminal released rows skip the direct issue-by-id sweep even without a current poll snapshot; weak, reopened, accepted pending-revalidation, or current-promotion rows still revalidate. | Treating all missing-poll states as clean. |
| Current poll terminal snapshot | After PR #856 merged, current poll truth could reconfirm a terminal `provider_issue_released:not_active` row and still leave the loop at `claim_reconcile:released`. | Equal-or-newer current poll terminal truth should reinforce that the released row is passive history. | Strong terminal released rows are consumed and fresh-discovery-blocked before per-claim `claim_reconcile:released` progress when the current poll map reconfirms terminal `not_active`; active/reopened snapshots still relaunch. | Hiding active reopened work or trusting older stale poll evidence. |
| Map-missing current poll terminal history | After PR #857 merged, completed/canceled filtering omitted CO-480 from the current poll map, and the per-claim path still recorded `claim_reconcile:released` for terminal `not_active` history. | A complete current poll that omits terminal issues by design does not make strong cached terminal released history active work. | Strong map-missing terminal released rows are consumed and fresh-discovery-blocked before `claim_reconcile:released` progress when there is no live worker, current promotion, or blocker-refresh reason. | Hiding live workers, current review promotion, blocker metadata refresh, or active/reopened issue truth. |
| Backlog released not_active | After PR #858 merged, CO-529 Backlog/backlog stayed released `provider_issue_released:not_active` but still reached `claim_issue_by_id:released` on latest main. After PR #860 merged, CO-521 and CO-524 reproduced the same direct issue-by-id loop when the current poll snapshot was unavailable. | Backlog is parked work; it should not need repeated direct issue-by-id reads unless active, reopened, retry, pending-review, Blocked, merge-closeout, live-worker, or retained-run evidence requires revalidation. When no current poll snapshot exists, passive classification must first bind to direct issue-by-id truth for the same Backlog snapshot. | Passive Backlog released rows with null retry metadata and no active/cancelable run, promotion, or merge-closeout evidence skip repeated direct issue-by-id and do not drive restart-required health only after recent explicit `passive_release` verification; active direct issue-by-id truth still starts work. | Blanket-suppressing released claims or hiding Blocked/retry/reopened/pending-review/merge-closeout work. |
| Retained merged-closeout history | After PR #859 merged, CO-522 live Linear truth is Done/completed and PR #795 is merged, but the released claim retained stale Blocked/started metadata plus historical `review_promotion` and `merge_closeout`. | Historical merged closeout metadata is not active authority once current polling omits the issue and no active/retry/current-promotion/cancelable-run evidence remains. | CO-522-shaped rows skip direct issue-by-id in the current-poll-omitted path; current promotion/reopened evidence still revalidates, and direct live Done reads clear stale `merge_closeout` residue. | Hiding current merge/review failures, retry, live-worker, or active/reopened paths. |
| Retained `review_promotion` metadata | CO-468 can retain a promoted `Merging` review-promotion snapshot that predates newer terminal Done issue truth. | Stale promotion metadata is history; current promotion metadata is still live routing evidence. | Stale promotions are ignored only when terminal issue truth is newer; current promotions force revalidation, including deferred-poll fail-closed paths. | Dropping review/merge promotion truth globally. |

## Readiness Gate
- Not done if:
  - released Done/Duplicate/Cancelled/Canceled claims can still trigger `restart_required` without active worker corroboration
  - released terminal claims with null retry metadata can still be counted as retrying work
  - the fix suppresses real active `provider_refresh_lifecycle_stuck`
  - provider-intake state is manually edited or deleted
  - status surfaces fabricate a coherent snapshot after timeout
  - the behavior is only repaired by restarting the host
  - a passive Backlog/backlog released `not_active` row with no active/retry/promotion/merge-closeout evidence still enters `claim_issue_by_id:released`
  - a passive Backlog/backlog released `not_active` row with no active/retry/promotion/merge-closeout evidence is hidden during a no-current-poll refresh without a recent explicit `passive_release` direct issue-by-id verification for the same Backlog snapshot, or active direct issue-by-id truth fails to start work
  - a CO-522-style retained merged-closeout row with stale non-active metadata, PR #795 merged proof, and no active/retry/current-promotion/cancelable-run evidence still enters `claim_issue_by_id:released` when current polling omits it
- Pre-implementation issue-quality review evidence:
  - 2026-05-20: live issue-context plus parent evidence show a narrow root-fix issue. The issue is not merely a timeout problem, not a provider-intake cleanup lane, and not a queue-capacity lane. The added CO-469 Duplicate/canceled case and CO-471 retry projection mismatch stay inside terminal released historical claim scope.
  - 2026-05-20 rework: PR #855's normalization-only fix was partial. Live current-main evidence still looped through the no-current-poll-snapshot `claim_issue_by_id:released` path, and CO-468 retained stale `review_promotion` metadata. PR #856 must bind the terminal released classifier before direct issue-by-id, and it must keep current promotion, reopen, accepted pending-revalidation, and weak rows revalidating.
  - 2026-05-20 second rework: PR #856's no-map fix was partial. Live current-main evidence after merge `a3deda2d7fd24e61e0c50ca4433a421306172a7e` still looped through `claim_reconcile:released` when the current poll map reconfirmed terminal `not_active` history such as CO-482/CO-478. The classifier must run before per-claim reconcile progress for equal-or-newer terminal current-poll snapshots.
  - 2026-05-21 UTC third rework: PR #857's current-poll-present fix was partial. Live current-main evidence after merge `e37f55b434f1bca59daacf38a1b2c2aa9ad9890f` still looped through `claim_reconcile:released` for CO-480 because completed/canceled issues are filtered out of the current poll map. The classifier must also run before per-claim reconcile progress for strong map-missing terminal `not_active` history.
  - 2026-05-21 fourth rework: PR #858's terminal map-missing fix was partial. Live latest-main evidence at `ae1847156fbae3a3bdd3fe7177a41045c3fd8447` still looped through `claim_issue_by_id:released` for CO-529 Backlog/backlog released `not_active`. The classifier must keep passive Backlog rows out of direct issue-by-id while preserving active/reopened/pending-review/retry/Blocked/merge-closeout failure paths.
  - 2026-05-21 fifth rework: PR #859's Backlog fix was partial. Live latest-main evidence at `e27ade20732c2a9ad859a30242309473cc263db0` still looped through `claim_issue_by_id:released` for CO-522, whose live Linear state is Done/completed while retained released history keeps stale Blocked/started metadata plus historical `review_promotion` and `merge_closeout` for merged PR #795. The classifier must keep stale merged-closeout history passive when current polling omits it, while preserving current promotion, retry, active/reopened, and direct live Done normalization paths.
  - 2026-05-21 sixth rework: PR #860's merged-closeout fix was partial. Live latest-main evidence at `65b05d2525a6c0fe793bf778d6f42147bc75aceb` still looped through `claim_issue_by_id:released` for CO-521 and then CO-524, both Backlog/backlog released `provider_issue_released:not_active` rows with no retained run, retry, review-promotion, or merge-closeout metadata. The Backlog passive classifier must apply when `resolveTrackedIssues` skips only after a direct issue-by-id read verifies the same inert Backlog snapshot and stores a recent explicit `passive_release` marker.
- Safeguard ownership split:
  - parent worker owns docs packet, source inspection, implementation, tests, validation, workpad, PR, and handoff
  - no same-issue child lane is active; serial decision recorded because docs/source/tests share one classification boundary and provider admission is unstable

## Technical Requirements
1. Identify the authority that turns provider refresh/reconcile outcome into polling health and restart-required state.
2. Classify released terminal historical claims as inactive for restart-required health when all of the following are true:
   - claim state is released
   - issue state/type is terminal (`completed`, `canceled`, `duplicate`, or equivalent terminal truth)
   - active run id, launch token, and retry fields are absent
   - no active worker/live issue corroboration says the claim is current work
3. Preserve released historical claim audit visibility.
4. Preserve active stuck refresh failure behavior for non-terminal or active claims.
5. Ensure terminal released claims with null retry fields do not manufacture retrying WIP projection.
6. Preserve status truth in `co-status --format json` and `/ui/data.json`.
7. Apply the strong terminal released claim classification before direct issue-by-id when the current tracked-issue poll snapshot is skipped or unavailable.
8. Treat retained `review_promotion` as stale only when cached terminal issue truth is newer than the promotion metadata; otherwise revalidate.
9. Consume and fresh-discovery-block current-poll terminal `not_active` snapshots before recording `claim_reconcile:released`, while preserving active/reopened relaunch.
10. Consume and fresh-discovery-block map-missing terminal `not_active` rows before recording `claim_reconcile:released`, while preserving live-worker, current-promotion, blocker-refresh, and active/reopened revalidation.
11. Keep passive Backlog/backlog released `not_active` rows out of repeated direct issue-by-id when they have no active run, retry, promotion, merge-closeout, or cancelable retained-run evidence and a recent explicit `passive_release` direct issue-by-id verification matches the same Backlog snapshot; if no verification exists, perform the bounded direct read and start work when the direct issue truth is active.
12. Keep stale retained merged-closeout released rows out of direct issue-by-id when current polling omits them and there is no active run, retry, current promotion, or cancelable retained-run evidence; clear stale `merge_closeout` residue when direct live Done truth is read.
13. Avoid timeout-only changes and provider-intake manual edits.

## CO-382 Fallback Decision Table
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove the fallback where terminal released historical claim reconciliation can be mistaken for active stuck refresh health.
- Retention decision: retain historical released claim records as a supported audit contract.
- Large-refactor check: keep the implementation narrow unless source inspection proves restart-required authority is split across unrelated modules and needs shared classification.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider refresh lifecycle classification | Terminal released historical claims can escalate to active stuck refresh health. | remove fallback | CO-571 | Released terminal claim with no active run/retry/worker corroboration, including no-current-poll-snapshot direct issue-by-id fallback, current-poll terminal `not_active` snapshots, and map-missing terminal `not_active` rows filtered out of the current poll map. | Observed 2026-05-20 | 2026-05-20 | This issue | Terminal released claims stop driving `restart_required`. | Focused released-claim, no-snapshot, current-poll terminal, map-missing terminal, stale-promotion, and active-stall regressions. |
| Passive Backlog released not_active classification | Parked Backlog released claims can escalate to direct issue-by-id stuck refresh health. | remove fallback | CO-571 | CO-529-style released `provider_issue_released:not_active` Backlog/backlog row with no active run, retry, promotion, merge-closeout, or cancelable retained-run evidence, including the CO-521/CO-524 no-current-poll-snapshot recurrence. | Observed 2026-05-21 | 2026-05-21 | This issue | Passive Backlog/not_active rows skip repeated direct issue-by-id only after recent explicit `passive_release` direct issue-by-id verification, while active/reopened/pending-review/retry/Blocked/merge-closeout paths still revalidate. | Focused CO-529 current-poll-omitted, CO-521 no-current-poll Backlog passive-verification, and active direct issue-by-id regressions plus existing active/reopened/current-promotion/active-stall regressions. |
| Stale retained merged-closeout classification | Retained merged closeout metadata can escalate stale released history to direct issue-by-id stuck refresh health. | remove fallback | CO-571 | CO-522-style released `provider_issue_released:not_active` row with stale non-active issue metadata, merged PR proof, stale promotion metadata, null retry fields, and no active/cancelable run. | Observed 2026-05-21 | 2026-05-21 | This issue | Stale retained merged-closeout rows skip direct issue-by-id when current polling omits them, while current promotion/reopened/direct-live-Done normalization paths remain active. | Focused CO-522 stale merged-closeout regressions. |
| Provider-intake history | Released historical claims stay retained for traceability. | justify retaining fallback | Provider-intake audit contract / CO-571 | Terminal issue release records historical claim state. | Existing behavior before CO-571 | 2026-05-20 | Non-expiring durable retention only with rationale | Separate approved audit-history redesign replaces retained claim history with equivalent source-labeled evidence. | Tests keep claims inactive without deleting evidence. |

- Contract name: provider-intake released historical claim audit retention.
- Owning surface: provider-intake state and control-host status/read models.
- Steady-state proof: raw released claim rows remain source-labeled audit evidence, while terminal released `not_active` claims, passive Backlog released `not_active` claims with a recent matching `passive_release` direct issue-by-id verification, and stale retained merged-closeout rows with complete cached metadata, null retry fields, and no active or cancelable retained run do not drive `restart_required` or retrying WIP.
- Tests/docs: `ProviderIssueHandoff.test.ts` terminal released metadata-only table, no-current-poll-snapshot regression, current-poll terminal snapshot regression, map-missing terminal snapshot regression, CO-529 Backlog regression, CO-521 no-current-poll Backlog passive-verification and active direct issue-by-id regressions, CO-522 stale retained merged-closeout regressions, stale/current `review_promotion` regressions, active-stuck regression, `ControlRuntime.test.ts` retry projection regression, and this CO-571 packet.
- Non-expiring rationale: retained released claim history is durable operator/audit evidence, not temporary compatibility debt; removal requires an approved archival redesign that preserves equivalent source-labeled claim/run evidence.

## Acceptance Criteria
- CO-472 Done `claim_issue_by_id:released` path is covered and benign without active corroboration.
- CO-461 Done `claim_reconcile:released` path is covered and benign without active corroboration.
- CO-469 Duplicate/canceled `claim_issue_by_id:released` path is covered and benign without active corroboration.
- CO-471 Done `claim_reconcile:released` with null retry metadata is covered so the selected released claim does not manufacture retrying WIP.
- CO-476 Duplicate/canceled `claim_issue_by_id:released` path is covered and benign without active corroboration.
- CO-451 Done `claim_issue_by_id:released` path is covered and benign without active corroboration.
- CO-468 Done `claim_issue_by_id:released` path is covered and benign without active corroboration.
- A real active/stuck path still fails closed with `provider_refresh_lifecycle_stuck` / `restart_required`.
- Strong terminal released claims skip direct issue-by-id when current tracked-issue polling is unavailable or skipped.
- CO-522-style stale retained merged-closeout history stays passive when current polling omits it, current promotion/reopened evidence still revalidates, and direct live Done truth clears stale `merge_closeout` residue.
- CO-521/CO-524-style no-current-poll Backlog history performs a bounded direct issue-by-id verification before becoming passive, records explicit `passive_release` metadata for the same Backlog snapshot, and starts work if direct truth is active.
- Accepted `provider_issue_rehydration_pending_revalidation` claims keep direct issue-by-id revalidation when bulk polling is unavailable.
- Stale retained `review_promotion` metadata does not keep terminal released history active, while current promotion metadata still revalidates in no-map and deferred-poll fail-closed paths.
- Current-poll terminal released snapshots remain passive without `claim_reconcile:released` progress or claim churn, while active/reopened current-poll snapshots still relaunch.
- Map-missing terminal released snapshots remain passive without `claim_reconcile:released` progress or claim churn when completed/canceled issue filtering leaves no current poll entry.
- `co-status --format json` and `/ui/data.json` remain truthful.
- No provider-intake manual edits or timeout-only fix is introduced.

## Validation Plan
- Focused released terminal claim tests for `claim_issue_by_id:released` and `claim_reconcile:released`.
- Focused projection test or assertion for released terminal claims with null retry metadata.
- Focused active stuck refresh negative test.
- Focused no-current-poll-snapshot regression.
- Focused current-poll terminal snapshot passive/reopened regressions.
- Focused map-missing terminal snapshot regression.
- Focused no-current-poll Backlog passive-verification and active direct issue-by-id regressions.
- Focused accepted pending-revalidation no-current-poll regression.
- Focused stale/current `review_promotion` regressions, including deferred-poll stale suppression and current-promotion revalidation.
- Spec guard, build, lint, test, docs checks, freshness, diff budget.
- Pack smoke for downstream CLI/control-host surface.
- Standalone review and elegance pass where tooling permits.

## Open Questions
- Whether the classification should be centralized in `providerIssueHandoff.ts` or exposed as a helper consumed by supervision/status projection too.
- Whether skipped terminal released claim counts should be exposed as advisory metadata without changing host health.

## Approvals
- Reviewer: CO-571 provider worker.
- Date: 2026-05-20.
