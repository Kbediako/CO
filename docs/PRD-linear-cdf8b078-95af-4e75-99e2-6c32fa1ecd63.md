# PRD - CO-571 released terminal claim reconciliation restart loop

## Traceability
- Linear issue: `CO-571` / `cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- Linear URL: https://linear.app/asabeko/issue/CO-571/co-stop-control-host-restart-loops-on-released-historical-claim
- Task registry id: `20260520-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- MCP Task ID: `linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- Canonical owner key: `control-host:released-claim-reconcile-restart-loop`
- Canonical TECH_SPEC: `tasks/specs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- Task checklist: `tasks/tasks-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- Agent task mirror: `.agent/task/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`

## Summary
- Problem Statement: after CO-556 landed on `origin/main` `da785a065d79d9680e189368ce24aafe2cd96178`, and again after the supervised control-host restarted onto current main `2c0d4667f03f1890a4c9aa3197ddfba2c8fb9657` to clear stale_supervised_source_root, the managed control-host can repeatedly report `provider_refresh_lifecycle_stuck` / `restart_required` while WIP is zero or inconsistent with the selected released claim. The stuck phase advances across retained released terminal historical claims, including CO-472 Done at `refresh:claim_issue_by_id_reconcile` / `claim_issue_by_id:released`, CO-461 Done at `refresh:claim_reconcile` / `claim_reconcile:released`, CO-469 Duplicate/canceled at `refresh:claim_issue_by_id_reconcile` / `claim_issue_by_id:released`, CO-471 Done at `refresh:claim_reconcile` / `claim_reconcile:released`, CO-476 Duplicate/canceled at `refresh:claim_issue_by_id_reconcile` / `claim_issue_by_id:released`, and retained-run Done/completed claims CO-451 and CO-468 at `claim_issue_by_id:released`.
- PR #855 reduced the original false-positive class, but the normalization-only fix was partial: after it merged, current main still reproduced a `claim_issue_by_id:released` loop when `resolveTrackedIssues` skipped or was unavailable, leaving no current poll map and falling through to direct issue-by-id reads. CO-468 also showed stale retained `review_promotion` metadata that must be distinguished from current promotion evidence.
- PR #856 fixed the no-current-poll-snapshot path, but live current-main proof after merge `a3deda2d7fd24e61e0c50ca4433a421306172a7e` still reproduced `claim_reconcile:released` when the current poll map reconfirmed a terminal `provider_issue_released:not_active` row such as CO-482 or CO-478. This rework must keep those current-poll terminal snapshots passive before per-claim reconcile progress, while reopened/active snapshots still relaunch.
- PR #857 fixed terminal claims present in the current poll map, but live current-main proof after merge `e37f55b434f1bca59daacf38a1b2c2aa9ad9890f` still reproduced `claim_reconcile:released` for CO-480 / `linear:3abba033-52f0-45f3-af58-cce4939f087f` because Linear polling filters completed/canceled issues out of the current issue map. This rework must keep strong map-missing terminal `not_active` history passive before `claim_reconcile:released` progress, without hiding current review-promotion, live-worker, blocker-metadata-refresh, or active/reopened revalidation paths.
- PR #858 fixed map-missing terminal history, but live current-main proof after merge `ae1847156fbae3a3bdd3fe7177a41045c3fd8447` still reproduced `refresh:claim_issue_by_id_reconcile` / `claim_issue_by_id:released` for CO-529 / `linear:2807d702-edce-4847-84d3-ca8628ab77fc`, a released `provider_issue_released:not_active` Backlog/backlog claim with WIP `0/3`. This rework must keep parked Backlog released claims passive before direct issue-by-id while preserving active, reopened, pending-review, retry, Blocked, live-worker, and merge-closeout paths.
- PR #859 fixed parked Backlog released history, but live latest-main proof after merge `e27ade20732c2a9ad859a30242309473cc263db0` still reproduced `refresh:claim_issue_by_id_reconcile` / `claim_issue_by_id:released` for CO-522 / `linear:b642e879-ba50-45ef-b0d9-b059afa9e932`. Live Linear truth is Done/completed, while the retained released claim is stale Blocked/started with historical `review_promotion` and `merge_closeout` for merged PR #795. This rework must classify retained merged-closeout history as passive only when current poll authority omits it and no active/retry/current-promotion/cancelable-run evidence exists, while preserving direct revalidation for current promotion and active/reopened paths.
- PR #860 fixed stale retained merged-closeout history, but live latest-main proof after merge `65b05d2525a6c0fe793bf778d6f42147bc75aceb` still reproduced `refresh:claim_issue_by_id_reconcile` / `claim_issue_by_id:released` for CO-521 / `linear:9749edb3-51e3-45e3-935b-8333dafafca5` and then CO-524 / `linear:0d975e30-67a5-4ea4-992a-61576c89d913`. Both are released `provider_issue_released:not_active` Backlog/backlog claims with no retained run, retry, review-promotion, or merge-closeout metadata when the current poll snapshot is unavailable. This rework must apply the parked Backlog passive classifier only after direct issue-by-id verifies the same inert Backlog snapshot and records recent explicit `passive_release` metadata.
- Desired Outcome: terminal released historical claims, parked Backlog released not-active claims, and stale retained merged-closeout history remain truthful audit evidence, but they do not manufacture a control-host restart loop when current authority shows no active work. Real active refresh stalls must still fail closed with debuggable `provider_refresh_lifecycle_stuck` and `restart_required` evidence.

## User Request Translation
- User intent / needs:
  - fix the reconciliation/classification authority that lets released terminal historical claims drive `restart_required`
  - preserve status truth for `co-status --format json` and `/ui/data.json`
  - prove both released claim paths named by live evidence and a real active stuck path
  - add CO-469 Duplicate/canceled and CO-471 Done as additional terminal released historical claim examples without widening beyond terminal released claims
  - add CO-476, CO-451, and CO-468 as further terminal released historical claim examples, including retained run_id/run_manifest_path bindings for CO-451 and CO-468
  - account for the observed `retrying=1` projection mismatch when the selected CO-471 released claim has `run_id=null` and all retry fields null
  - handle the no-current-poll-snapshot path without relying on direct issue-by-id sweeps for strong terminal released history, while preserving accepted pending-revalidation rechecks
  - handle the current-poll terminal snapshot path without recording `claim_reconcile:released` progress or claim churn when the poll map reconfirms terminal `not_active` truth
  - handle the map-missing current-poll path caused by completed/canceled issue filtering without recording `claim_reconcile:released` progress for strong terminal `not_active` history
  - handle the CO-529-style Backlog/backlog released `not_active` path without entering direct issue-by-id, while preserving active/reopened/pending-review/retry/Blocked/merge-closeout revalidation
  - handle the CO-521/CO-524-style Backlog/backlog released `not_active` path when the current poll snapshot is unavailable by verifying the same inert Backlog snapshot with direct issue-by-id before skipping repeated direct reads
  - handle the CO-522-style retained merged-closeout path where live Linear truth is Done/completed and PR #795 is merged, but stale `review_promotion` / `merge_closeout` metadata keeps the released claim outside the terminal passive classifier
  - distinguish stale retained `review_promotion` metadata from current promotion metadata
- Success criteria / acceptance:
  - `claim_issue_by_id:released` terminal claims for CO-472 and CO-469 do not cause `provider_refresh_lifecycle_stuck` / `restart_required` without active worker/live issue corroboration
  - `claim_reconcile:released` terminal claims for CO-461 do not cause `provider_refresh_lifecycle_stuck` / `restart_required` without active worker/live issue corroboration
  - `claim_reconcile:released` terminal claims for CO-471 do not cause `provider_refresh_lifecycle_stuck` / `restart_required` without active worker/live issue corroboration, and the selected released claim itself is not projected as retrying when retry metadata is null
  - genuine active refresh stalls still fail closed and keep provider keys and phase evidence visible
  - no fabricated coherent snapshot is emitted after timeout or health failure
  - no provider-intake manual edits or one-off restart is required for recovery
- Constraints / non-goals:
  - keep the fix at provider refresh lifecycle and released-claim classification authority
  - do not hide real unhealthy host states
  - do not increase timeouts as the primary fix
  - do not disable provider workers, operator oversight, Telegram oversight, or freshness gauges
  - do not fold unrelated quota hygiene or provider-intake cleanup work into CO-571

## Intent Checksum
- Exact user wording / phrases to preserve:
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
  - no active workers/WIP 0/3
  - `retrying=1` projection mismatch
  - no fabricated coherent snapshot
  - no provider-intake manual edits
- Protected terms / exact artifact and surface names:
  - `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `refresh:claim_issue_by_id_reconcile`
  - `claim_issue_by_id:released`
  - `refresh:claim_reconcile`
  - `claim_reconcile:released`
  - released terminal historical claims
  - `linear:590e4e09-315a-4957-bb72-66b8322e86a6`
  - `linear:8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc`
  - `linear:e1ecc66e-4733-4b89-8030-f626607e0284`
  - `linear:93f80950-06e5-41f2-9186-f4877e69f563`
  - CO-472 Done
  - CO-461 Done
  - CO-469 Duplicate / canceled
  - CO-471 Done
  - no active workers/WIP 0/3
  - `counts running=0 retrying=1 max_allowed=3`
  - no-current-poll-snapshot path
  - stale `review_promotion`
  - `co-status --format json`
  - `/ui/data.json`
  - `provider-intake-state.json`
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
  - treating every `/ui/data.json` timeout as healthy
  - clearing `restart_required` for genuine active refresh stalls
  - deleting, editing, or regenerating `provider-intake-state.json`
  - increasing timeouts instead of fixing classification authority
  - ignoring retained released claim audit records entirely
  - requiring an operator one-off restart as the fix
  - broadening into unrelated quota hygiene, provider admission capacity, or freshness-gauge redesign
  - assuming current-poll terminal handling is complete when terminal issues filtered from the poll map can still fall through as map-missing claims
  - treating passive Backlog/not_active as the same as Blocked, retry, pending-review, merge-closeout, or reopened work
  - treating stale retained `merge_closeout` metadata as current active authority after merged PR plus live Linear Done proof

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Released Done claims | CO-472, CO-461, CO-451, and CO-468 are terminal Done historical claims, but their released claim reconciliation can still coincide with `provider_refresh_lifecycle_stuck` / `restart_required`; CO-451 and CO-468 retain historical run_id/run_manifest_path bindings with retry fields null. | Terminal Done claims should remain audit-visible but inactive unless active/live-run corroboration exists. | Done released claims with no retry/active worker corroboration do not drive restart-required health, even when a non-cancellable historical run binding is retained. | Removing historical claim visibility or hiding active retained workers. |
| Released Duplicate/canceled claims | CO-469 and CO-476 are terminal Duplicate/canceled released historical claims with `run_id=null` and retry fields null. | Canceled terminal claims should be treated as terminal released history, not active work. | Duplicate/canceled released claims follow the same inactive terminal classification as Done claims. | Changing Linear workflow state semantics. |
| Released retry projection mismatch | CO-471 is a terminal Done released historical claim with `run_id=null` and retry fields null while control-host status reported `running=0 retrying=1 max_allowed=3`. | A selected released claim with null retry metadata should not itself contribute retrying WIP. | Terminal released claims remain excluded from retrying counts; separate real retrying claims, if any, remain visible. | Suppressing unrelated active retrying work. |
| Active refresh stalls | Real active work can still get stuck during provider refresh. | Real active stalls must fail closed with phase/provider evidence. | Active stuck paths still emit `provider_refresh_lifecycle_stuck`, `restart_required`, and provider keys. | Declaring all refresh stalls benign. |
| Status surfaces | `co-status --format json` and `/ui/data.json` can time out or show unhealthy host state. | Status must be truthful even during degraded reads. | No fabricated coherent snapshot; no hiding of genuine unhealthy host states. | Broader status dashboard redesign. |
| Provider-intake evidence | `provider-intake-state.json` retains released historical claims and audit history. | Intake history is audit evidence, not a manual repair target. | Code-level classification ignores terminal released claims only for active restart decisions. | Manual state-file edits or cleanup. |
| No current poll snapshot | A skipped/unavailable tracked-issue poll can leave no bulk issue map, after which the no-map resolver re-enters direct issue-by-id for terminal released history. | Strong cached terminal released issue truth is sufficient to avoid a direct issue-by-id sweep, but cached pending-revalidation claims still need a live issue read. | Strong terminal released rows skip direct issue-by-id even without a current poll map; weak, pending-reopen, accepted pending-revalidation, or current-promotion rows still revalidate. | Treating every missing poll snapshot as healthy. |
| Current poll terminal snapshot | After PR #856 merged, the current poll map could include the same terminal Done/completed issue as a released `not_active` claim, and the per-claim reconcile path still recorded `claim_reconcile:released` before treating it as passive. | A current poll snapshot that reconfirms equal-or-newer terminal `not_active` truth is stronger evidence that the historical row is passive, not active WIP. | Strong released terminal rows are consumed and fresh-discovery-blocked before `claim_reconcile:released` progress when the current poll map reconfirms terminal `not_active`; active/newer reopened snapshots still relaunch. | Hiding active reopened issues or stale older poll evidence. |
| Map-missing current poll terminal history | After PR #857 merged, CO-480 was terminal Done/completed and released `not_active`, but completed/canceled filtering omitted it from the current poll map, so the per-claim path still recorded `claim_reconcile:released`. | A complete current poll that intentionally omits completed/canceled issues is not evidence of active work for a strong cached terminal released row. | Strong map-missing released terminal rows are consumed and fresh-discovery-blocked before `claim_reconcile:released` progress when no live worker, current promotion, or blocker-refresh reason exists. | Hiding live workers, current review promotion, blocker metadata refresh, or active/reopened issue truth. |
| Passive Backlog released not_active | After PR #858 merged, CO-529 was Backlog/backlog, released as `provider_issue_released:not_active`, and still drove `claim_issue_by_id:released` when the current source had WIP `0/3`. After PR #860 merged, CO-521 and CO-524 reproduced the same loop when the current poll snapshot was unavailable. | Backlog is parked, not a repeated direct issue-by-id recovery trigger; promotion/reopen evidence should arrive through current poll/fresh discovery/autopilot, while Blocked/retry/pending-review/merge-closeout paths keep their existing revalidation. When no current poll snapshot exists, the passive decision must first bind to an explicit direct issue-by-id read for the same Backlog snapshot. | Released Backlog/not_active rows with no active run, no retry fields, no promotion/merge-closeout metadata, and no cancelable retained run skip repeated direct issue-by-id only after a recent explicit `passive_release` direct issue-by-id verification for the same issue state/update snapshot; active or reopened direct truth still starts work. | Blanket-suppressing released claims, hiding Blocked work, or blocking active/reopened/pending-review/retry/merge-closeout evidence. |
| Stale retained merged closeout | After PR #859 merged, CO-522 live Linear truth is Done/completed and PR #795 is merged, but retained released history still has stale Blocked/started issue metadata plus historical `review_promotion` and `merge_closeout`. | Merged PR proof plus current poll omission and stale non-active metadata are historical authority, not active worker authority. | Released/not_active rows with merged closeout history, stale promotion metadata, null retry metadata, no active or cancelable retained run, and no current poll entry skip direct issue-by-id; direct live Done revalidation clears stale `merge_closeout` residue when it is used. | Hiding current promotion, retry, live-worker, active/reopened, or current merge-closeout failures. |
| Retained review promotion | CO-468 can retain a promoted `Merging` review-promotion snapshot older than newer terminal Done issue truth. | Promotion metadata is active only when it is current relative to terminal issue truth. | Stale promotion metadata is ignored for terminal history; current promotion metadata forces revalidation, including deferred-poll fail-closed paths. | Dropping review/merge promotion routing globally. |

## Not Done If
- Released Done, Duplicate, Cancelled/Canceled, or Duplicate/canceled claims can still trigger `restart_required` without active worker/live issue corroboration.
- A selected released terminal claim with null retry metadata can still be counted as retrying work.
- The fix treats all `/ui/data.json` timeouts as healthy or clears restart evidence for real active refresh stalls.
- `co-status --format json` or `/ui/data.json` emits a fabricated coherent snapshot after timeout.
- The control-host only looks healthy because stale lower-authority artifacts were ignored without binding to current child/run identity.
- The no-current-poll-snapshot path can still enter `claim_issue_by_id:released` direct issue-by-id reads for strong terminal released history.
- A current-poll terminal `not_active` snapshot can still record `claim_reconcile:released`, churn the released claim, or drive `restart_required`.
- A map-missing terminal `not_active` row can still record `claim_reconcile:released` only because completed/canceled issues are absent from the current poll map.
- A passive Backlog/backlog released `not_active` row with no active/retry/promotion/merge-closeout evidence can still enter `claim_issue_by_id:released` or set `restart_required`.
- A passive Backlog/backlog released `not_active` row with no active/retry/promotion/merge-closeout evidence can be hidden during a no-current-poll refresh without a recent explicit `passive_release` direct issue-by-id verification for the same Backlog snapshot.
- Active direct issue-by-id truth for a Backlog/backlog released `not_active` row can fail to start work.
- A CO-522-style retained merged-closeout released row with stale non-active issue metadata, merged PR proof, live Linear Done/completed truth, null retry metadata, and no active/cancelable retained run can still enter `claim_issue_by_id:released` when current polling omits it.
- Stale retained `review_promotion` metadata can still keep a newer terminal released row classified as active, or current promotion metadata is hidden.
- The solution relies on provider-intake manual edits, timeout-only changes, or another one-off restart.

## Goals
- Reproduce the retained released terminal historical claim shape for CO-472, CO-461, CO-469, CO-471, CO-476, CO-451, and CO-468.
- Prevent terminal released historical claims with no active run/retry/worker corroboration from causing `provider_refresh_lifecycle_stuck` / `restart_required`.
- Preserve genuine active stuck refresh failure behavior.
- Stop no-current-poll-snapshot terminal released rows before direct issue-by-id.
- Stop current-poll terminal released rows before per-claim `claim_reconcile:released` progress when the poll snapshot reconfirms terminal `not_active`.
- Stop map-missing terminal released rows before per-claim `claim_reconcile:released` progress when completed/canceled filtering leaves no current poll entry but cached terminal truth is strong.
- Stop parked Backlog released `not_active` rows before repeated direct issue-by-id when there is no active run, retry, promotion, merge-closeout, or cancelable retained-run evidence and a recent explicit `passive_release` direct issue-by-id verification matches the same Backlog snapshot.
- Stop stale retained merged-closeout released rows before direct issue-by-id when current poll authority omits the issue and there is no active/retry/current-promotion/cancelable-run evidence.
- Treat stale retained `review_promotion` as historical evidence while preserving current promotion revalidation.
- Preserve truthful status and audit visibility.

## Non-Goals
- No provider-intake manual edits.
- No timeout-only increase.
- No disabling provider workers, operator autopilot, Telegram oversight, or freshness gauge.
- No unrelated quota-hygiene, capacity, or admission rewrite.
- No deletion of retained released historical claim records.

## Acceptance Criteria
- CO-472 Done `claim_issue_by_id:released` is covered by a regression that no longer drives restart-required health without active corroboration.
- CO-461 Done `claim_reconcile:released` is covered by a regression that no longer drives restart-required health without active corroboration.
- CO-469 Duplicate/canceled `claim_issue_by_id:released` is covered by a regression when it fits the same terminal released historical claim predicate.
- CO-471 Done `claim_reconcile:released` with null retry metadata is covered by projection/classification evidence so the selected released claim cannot manufacture retrying WIP.
- CO-476 Duplicate/canceled `claim_issue_by_id:released` is covered by a regression when it fits the same terminal released historical claim predicate.
- CO-451 Done retained-run `claim_issue_by_id:released` is covered by a regression that no longer drives restart-required health without active corroboration.
- CO-468 Done retained-run `claim_issue_by_id:released` is covered by a regression that no longer drives restart-required health without active corroboration.
- A no-current-poll-snapshot terminal released row is covered by a regression that does not enter direct issue-by-id.
- A current-poll terminal released row is covered by a regression that keeps the claim passive without direct issue-by-id, start/resume, `claim_reconcile:released` progress, or claim `updated_at` churn.
- A map-missing terminal released row is covered by a regression that keeps the claim passive without direct issue-by-id, start/resume, `claim_reconcile:released` progress, or claim `updated_at` churn.
- A current-poll active/reopened snapshot is covered by a regression that still relaunches the issue.
- A CO-529-style Backlog/backlog released `not_active` row is covered by a regression that does not enter direct issue-by-id or set restart-required health.
- A CO-522-style retained merged-closeout released row is covered by regressions that keep it passive when current polling omits it, keep current promotion/reopened evidence revalidating, and clear stale `merge_closeout` when direct live Done truth is read.
- An accepted `provider_issue_rehydration_pending_revalidation` row is covered by a no-current-poll regression that still enters direct issue-by-id and releases terminal truth.
- Stale retained `review_promotion` is covered by regressions, including deferred-poll suppression, with current-promotion negative regressions that still revalidate in no-map and deferred-poll fail-closed paths.
- A real active/stuck provider refresh path still fails closed with `provider_refresh_lifecycle_stuck` / `restart_required`.
- Status projection remains truthful and does not fabricate a healthy snapshot after timeout or health failure.
- `provider-intake-state.json` is not manually edited as part of the repair.

## Validation Plan
- Focused tests for `claim_issue_by_id:released` terminal Done and Duplicate/canceled claims.
- Focused tests for `claim_reconcile:released` terminal Done claims.
- Focused projection coverage for terminal released claims with null retry fields so they do not count as retrying work.
- Focused no-current-poll-snapshot coverage for terminal released history before direct issue-by-id.
- Focused current-poll terminal snapshot coverage for passive terminal truth and active/reopened relaunch.
- Focused map-missing current-poll coverage for filtered completed/canceled terminal truth before per-claim reconcile progress.
- Focused Backlog released `not_active` coverage for the CO-529 direct issue-by-id recurrence.
- Focused no-current-poll accepted pending-revalidation coverage.
- Focused stale/current `review_promotion` coverage, including deferred-poll stale suppression and current-promotion revalidation.
- Focused negative test for real active stuck refresh behavior.
- `node scripts/spec-guard.mjs --dry-run`.
- `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`.
- `npm run pack:smoke` because control-host CLI/package behavior is downstream-facing.
- Standalone review and elegance pass, or exact blocker evidence in the workpad.

## CO-382 Fallback Decision Table
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove the fallback where terminal released historical claim reconciliation can be classified as an active provider refresh stall and trigger control-host restart-required health.
- Retention decision: retain released historical claim records as a supported audit contract, not as active work authority.
- Large-refactor check: a narrow classification authority fix is acceptable unless source inspection shows split restart-required authority that cannot be corrected without shared helper consolidation.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider refresh lifecycle classification | Terminal released historical claims can still be interpreted as active stuck refresh evidence. | remove fallback | CO-571 | `claim_issue_by_id:released` or `claim_reconcile:released` with terminal issue truth and no active run/retry/worker corroboration, including no-current-poll-snapshot direct issue-by-id fallback, current-poll terminal `not_active` snapshots, and map-missing terminal `not_active` rows filtered out of the current poll map. | Observed 2026-05-20 | 2026-05-20 | This issue | Terminal released claims stop driving `restart_required` while active stalls still fail closed. | Focused released-claim, no-snapshot, current-poll terminal, map-missing terminal, stale-promotion, and active-stall regressions. |
| Passive Backlog released not_active classification | Parked Backlog released claims can still fall through to direct issue-by-id and look like active stuck refresh work. | remove fallback | CO-571 | CO-529-style released `provider_issue_released:not_active` Backlog/backlog row with no active run, retry, promotion, merge-closeout, or cancelable retained-run evidence. | Observed 2026-05-21 | 2026-05-21 | This issue | Passive Backlog/not_active rows skip repeated direct issue-by-id only after recent explicit `passive_release` verification, while active/reopened/pending-review/retry/Blocked/merge-closeout paths still revalidate. | Focused CO-529 Backlog regression plus CO-521 no-current-poll Backlog passive-verification and active direct issue-by-id regressions. |
| Stale retained merged-closeout classification | Retained merged closeout metadata can still fall through to direct issue-by-id and look like active stuck refresh work. | remove fallback | CO-571 | CO-522-style released `provider_issue_released:not_active` row with stale non-active issue metadata, merged PR proof, stale promotion metadata, null retry fields, and no active/cancelable run. | Observed 2026-05-21 | 2026-05-21 | This issue | Stale retained merged-closeout rows skip direct issue-by-id when current polling omits them, while current promotion/reopened/direct-live-Done normalization paths remain active. | Focused CO-522 stale merged-closeout regressions. |
| Retained released claim audit history | Released historical claims remain in `provider-intake-state.json`. | justify retaining fallback | Provider-intake audit contract / CO-571 | Terminal issue release leaves historical claim evidence for operator traceability. | Existing behavior before CO-571 | 2026-05-20 | Non-expiring durable retention only with rationale | Separate approved audit-history redesign replaces provider-intake history with equivalent source-labeled evidence. | Tests keep terminal claims inactive without deleting evidence. |

- Contract name: provider-intake released historical claim audit retention.
- Owning surface: provider-intake state and control-host status/read models.
- Steady-state proof: raw released claim rows remain source-labeled audit evidence, while terminal released `not_active` claims, passive Backlog released `not_active` claims, and stale retained merged-closeout rows with complete cached metadata, null retry fields, and no active or cancelable retained run do not drive `restart_required` or retrying WIP.
- Tests/docs: `ProviderIssueHandoff.test.ts` terminal released metadata-only table, no-current-poll-snapshot regression, current-poll terminal snapshot regression, map-missing terminal snapshot regression, CO-529 Backlog regression, CO-522 stale retained merged-closeout regressions, stale/current `review_promotion` regressions, active-stuck regression, `ControlRuntime.test.ts` retry projection regression, and this CO-571 packet.
- Non-expiring rationale: retained released claim history is durable operator/audit evidence, not temporary compatibility debt; removal requires an approved archival redesign that preserves equivalent source-labeled claim/run evidence.

## Open Questions
- Does the root cause live entirely inside `providerIssueHandoff.ts`, or does supervision health need an additional terminal-claim corroboration filter?
- Which existing provider polling health payload field should carry skipped terminal-claim evidence for operator debugging without marking the host unhealthy?

## Approvals
- Product: CO-571 Linear issue contract and parent-provided live evidence.
- Engineering: worker implementation lane on 2026-05-20; fourth-rework worker update on 2026-05-21.
- Design: N/A.
