# ACTION_PLAN - CO-571 released terminal claim reconciliation restart loop

## Summary
- Goal: stop retained released terminal historical claims from repeatedly driving control-host `provider_refresh_lifecycle_stuck` / `restart_required` when WIP is `0/3`, while preserving real active-stall fail-closed behavior.
- Scope: provider refresh lifecycle classification, released claim reconciliation, terminal Done and Duplicate/canceled issue truth, parked Backlog released `not_active` truth, status truth, tests, and validation.
- Assumptions:
  - CO-556 source freshness policy already landed on `origin/main` `da785a065d79d9680e189368ce24aafe2cd96178`.
  - CO-472, CO-461, CO-469, CO-471, CO-476, CO-451, and CO-468 are terminal released historical claims, not current active workers.
  - After PR #856 merged, CO-482 and CO-478 showed the remaining current-poll terminal snapshot path: the bulk poll map can reconfirm terminal `not_active` truth and still leave the loop at `claim_reconcile:released` unless the passive classifier runs before per-claim reconcile progress.
  - After PR #857 merged, CO-480 showed the remaining map-missing current-poll terminal path: completed/canceled issue filtering can omit terminal `not_active` truth from the current poll map and still leave the loop at `claim_reconcile:released` unless the passive classifier runs before per-claim reconcile progress.
  - After PR #858 merged, CO-529 showed the remaining Backlog released `not_active` path: a parked Backlog/backlog released claim can still fall through to direct issue-by-id and leave the loop at `claim_issue_by_id:released`.
  - After PR #859 merged, CO-522 showed the remaining retained merged-closeout history path: live Linear truth is Done/completed and PR #795 is merged, but stale `review_promotion` / `merge_closeout` metadata kept the released claim in `claim_issue_by_id:released`.
  - After PR #860 merged, CO-521 and CO-524 showed the remaining no-current-poll Backlog released `not_active` path: parked Backlog/backlog released claims can still fall through to direct issue-by-id when `resolveTrackedIssues` skips even though they have no retained run, retry, review-promotion, or merge-closeout metadata.
  - After initial PR #861 review, Codex found that hiding no-current-poll Backlog claims without direct issue-by-id verification could hide active direct truth; the final fix must record explicit recent `passive_release` metadata for the same Backlog snapshot before skipping repeated direct reads.
  - After PR #861 merged, CO-520 showed the remaining stale blocker-snapshot path: direct issue-by-id confirmed CO-520 itself was Backlog/backlog, but another issue still carried CO-520 as a Blocked/started blocker and prevented `passive_release` from being recorded/reused.
  - `provider-intake-state.json` remains audit evidence and is not a manual repair target.
  - PR #855's normalization-only fix was partial; PR #856 must cover no-current-poll-snapshot direct issue-by-id fallback and stale/current `review_promotion` behavior.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
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
  - no-current-poll-snapshot path
  - current-poll terminal snapshot
  - map-missing current poll terminal history
  - CO-529
  - CO-521
  - CO-524
  - CO-520
  - `linear:617541e3-39f0-4926-8105-9b2a5c053a5b`
  - stale blocker snapshot
  - direct own-issue Backlog verification
  - `passive_release`
  - Backlog/backlog released `not_active`
  - CO-522
  - retained `review_promotion`
  - retained `merge_closeout`
  - PR #795 merged
  - live Linear Done/completed
  - stale `review_promotion`
  - no fabricated coherent snapshot
  - no provider-intake manual edits
  - `co-status --format json`
  - `/ui/data.json`
  - `provider-intake-state.json`
- Not done if:
  - terminal released claims still cause `restart_required` without active corroboration
  - terminal released claims with null retry metadata still manufacture retrying WIP
  - active stuck refresh behavior is hidden
  - status surfaces fabricate healthy state
  - provider-intake state is manually edited
  - the fix is only a timeout bump or one-off restart
  - no-current-poll-snapshot terminal history still reaches direct issue-by-id
  - current-poll terminal `not_active` history still records `claim_reconcile:released` or churns the claim
  - map-missing terminal `not_active` history still records `claim_reconcile:released` only because completed/canceled issue filtering leaves no current poll entry
  - passive Backlog/backlog released `not_active` still records `claim_issue_by_id:released` or sets restart-required health without active/retry/promotion/merge-closeout evidence
  - passive Backlog/backlog released `not_active` is hidden during a no-current-poll refresh without a recent explicit `passive_release` direct issue-by-id verification for the same Backlog snapshot
  - stale blocker metadata can suppress `passive_release` after direct issue-by-id verifies the released claim's own issue is Backlog/backlog
  - active direct issue-by-id truth for a Backlog/backlog released `not_active` row fails to start work
  - stale retained merged-closeout history still records `claim_issue_by_id:released` or sets restart-required health when current polling omits it and there is no active/retry/current-promotion/cancelable-run evidence
  - stale `review_promotion` keeps terminal history active, or current promotion truth is hidden
- Pre-implementation issue-quality review:
  - 2026-05-20: CO-571 is a narrow root-cause lane for released terminal historical claim reconciliation. CO-469 Duplicate/canceled and CO-471 Done are included because both are terminal released history with null run/retry fields, not new active-work behaviors.
  - 2026-05-20 rework: after PR #855 merged, live current-main evidence still hit `claim_issue_by_id:released` when no current poll snapshot existed. The rework must bind the terminal released classifier before direct issue-by-id, preserve accepted `provider_issue_rehydration_pending_revalidation` direct rechecks, and distinguish stale `review_promotion` from current promotion metadata across no-map and deferred-poll fail-closed paths.
  - 2026-05-20 second rework: after PR #856 merged, live current-main evidence still hit `claim_reconcile:released` when the current poll map reconfirmed terminal `not_active` claims such as CO-482/CO-478. The rework must bind the terminal released classifier before per-claim reconcile progress for equal-or-newer terminal current-poll snapshots, while preserving active/reopened relaunch.
  - 2026-05-21 UTC third rework: after PR #857 merged, live current-main evidence still hit `claim_reconcile:released` for CO-480 when completed/canceled filtering left no current poll entry. The rework must bind the terminal released classifier before per-claim reconcile progress for strong map-missing terminal rows, while preserving live-worker, current-promotion, blocker-refresh, and active/reopened revalidation.
  - 2026-05-21 fourth rework: after PR #858 merged, live latest-main evidence at `ae1847156fbae3a3bdd3fe7177a41045c3fd8447` still hit `claim_issue_by_id:released` for CO-529 Backlog/backlog released `not_active`. The rework must keep passive Backlog rows out of direct issue-by-id while preserving active/reopened/pending-review/retry/Blocked/merge-closeout paths.
  - 2026-05-21 fifth rework: after PR #859 merged, live latest-main evidence at `e27ade20732c2a9ad859a30242309473cc263db0` still hit `claim_issue_by_id:released` for CO-522. The rework must treat stale retained merged-closeout history as passive when current polling omits the issue, while preserving current promotion/reopened/direct-live-Done normalization paths.
  - 2026-05-21 sixth rework: after PR #860 merged, live latest-main evidence at `65b05d2525a6c0fe793bf778d6f42147bc75aceb` still hit `claim_issue_by_id:released` for CO-521 and CO-524. The rework must treat passive Backlog released `not_active` rows as passive when the current poll snapshot is unavailable only after direct issue-by-id verifies the same inert Backlog snapshot, while preserving active/reopened/pending-review/retry/Blocked/merge-closeout revalidation.
  - 2026-05-21 seventh rework: after PR #861 merged, live latest-main evidence at `c66abd777d74aebbf9f8b046f54581962ad7703a` still hit `claim_issue_by_id:released` for CO-520 because stale blocker metadata reported Blocked/started while direct issue-by-id verified CO-520 itself was Backlog/backlog. Direct own-issue verification must outrank stale blocker snapshots for `passive_release`, while active direct truth still starts work.
- Fallback / refactor decision:
  - This task touches retained historical/cached provider-intake evidence. Decision: `remove fallback` for terminal released claims being treated as active stuck refresh health; retain historical claim records as supported audit evidence.
- Durable retention evidence:
  - Provider-intake released claim records remain traceability evidence. Tests should prove they are inactive for restart decisions without deleting the evidence.
- Large-refactor check: start with a narrow classification authority fix. Escalate to a shared helper only if source inspection finds duplicated terminal-claim predicates across health/status surfaces.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider refresh lifecycle classification | Terminal released historical claims can still be interpreted as active stuck refresh evidence. | remove fallback | CO-571 | `claim_issue_by_id:released` or `claim_reconcile:released` with terminal issue truth and no active run/retry/worker corroboration, including no-current-poll-snapshot direct issue-by-id fallback, current-poll terminal `not_active` snapshots, and map-missing terminal `not_active` rows filtered out of the current poll map. | Observed 2026-05-20 | 2026-05-20 | This issue | Terminal released claims stop driving `restart_required` while active stalls still fail closed. | Focused released-claim, no-snapshot, current-poll terminal, map-missing terminal, stale-promotion, and active-stall regressions. |
| Passive Backlog released not_active classification | Parked Backlog released claims can still be interpreted as direct issue-by-id active stuck refresh work. | remove fallback | CO-571 | CO-529-style released `provider_issue_released:not_active` Backlog/backlog row with no active run, retry, promotion, merge-closeout, or cancelable retained-run evidence, including the CO-521/CO-524 no-current-poll-snapshot recurrence and CO-520 stale blocker-snapshot recurrence. | Observed 2026-05-21 | 2026-05-21 | This issue | Passive Backlog/not_active rows skip repeated direct issue-by-id only after recent explicit `passive_release` direct issue-by-id verification for the claim's own Backlog snapshot, while active/reopened/pending-review/retry/Blocked/merge-closeout paths still revalidate. | Focused CO-529 current-poll-omitted, CO-521 no-current-poll Backlog passive-verification, CO-520 stale blocker-snapshot regression, and active direct issue-by-id regressions plus existing active/reopened/current-promotion/active-stall regressions. |
| Stale retained merged-closeout classification | Retained merged closeout metadata can still be interpreted as direct issue-by-id active stuck refresh work. | remove fallback | CO-571 | CO-522-style released `provider_issue_released:not_active` row with stale non-active issue metadata, merged PR proof, stale promotion metadata, null retry fields, and no active/cancelable run. | Observed 2026-05-21 | 2026-05-21 | This issue | Stale retained merged-closeout rows skip direct issue-by-id when current polling omits them, while current promotion/reopened/direct-live-Done normalization paths remain active. | Focused CO-522 stale merged-closeout regressions. |
| Retained released claim audit history | Released historical claims remain in `provider-intake-state.json`. | justify retaining fallback | Provider-intake audit contract / CO-571 | Terminal issue release leaves historical claim evidence for operator traceability. | Existing behavior before CO-571 | 2026-05-20 | Non-expiring durable retention only with rationale | Separate approved audit-history redesign replaces retained claim history with equivalent source-labeled evidence. | Tests keep terminal claims inactive without deleting evidence. |

- Contract name: provider-intake released historical claim audit retention.
- Owning surface: provider-intake state and control-host status/read models.
- Steady-state proof: raw released claim rows remain source-labeled audit evidence, while terminal released `not_active` claims, passive Backlog released `not_active` claims with recent matching `passive_release` direct issue-by-id verification, and stale retained merged-closeout rows with complete cached metadata, null retry fields, and no active or cancelable retained run do not drive `restart_required` or retrying WIP, including when the current poll snapshot is unavailable.
- Tests/docs: `ProviderIssueHandoff.test.ts` terminal released metadata-only table, no-current-poll-snapshot regression, current-poll terminal snapshot regression, map-missing terminal snapshot regression, CO-529 Backlog regression, CO-521 no-current-poll Backlog passive-verification and active direct issue-by-id regressions, CO-520 stale blocker-snapshot regression, CO-522 stale retained merged-closeout regressions, stale/current `review_promotion` regressions, active-stuck regression, `ControlRuntime.test.ts` retry projection regression, and this CO-571 packet.
- Non-expiring rationale: retained released claim history is durable operator/audit evidence, not temporary compatibility debt; removal requires an approved archival redesign that preserves equivalent source-labeled claim/run evidence.

## Milestones & Sequencing
1. Register the CO-571 docs-first packet: PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, `.agent/task` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Run docs-review or record exact blocker before implementation.
3. Inspect provider refresh lifecycle authority around `providerIssueHandoff`, provider polling health, and control-host supervision/status projection.
4. Add focused failing regressions for CO-472 / CO-469 `claim_issue_by_id:released`, CO-461 / CO-471 `claim_reconcile:released`, selected-claim retry projection, no-current-poll-snapshot direct issue-by-id suppression, current-poll terminal passive/reopened snapshots, map-missing terminal passive snapshots, CO-529 Backlog direct issue-by-id suppression, CO-521 no-current-poll Backlog passive-verification and active direct issue-by-id revalidation, CO-520 stale blocker-snapshot passive-verification, CO-522 stale retained merged-closeout suppression and live Done normalization, accepted pending-revalidation rechecks, stale/current `review_promotion` including deferred-poll fail-closed, and a real active stuck path.
5. Implement the smallest classification fix at the authority seam before direct issue-by-id or per-claim reconcile progress while preserving weak/reopened/live-worker/current-promotion/blocker-refresh and active/retry/Blocked/merge-closeout revalidation.
6. Rerun focused tests and update docs/task mirrors with validation evidence.
7. Run required gates: spec guard, build, lint, test, docs checks, freshness, diff budget, pack smoke, review/elegance where feasible.
8. Push branch and open/update a draft PR linked to CO-571. Do not merge.

## Dependencies
- `providerIssueHandoff.ts`
- Provider polling health / lifecycle state
- Control-host supervision restart-required projection
- `co-status --format json`
- `/ui/data.json`
- `provider-intake-state.json`
- Linear terminal state types for Done and Duplicate/canceled issues

## Validation
- Checks / tests:
  - focused released terminal claim tests
  - focused retry projection consistency test for released terminal claims with null retry fields
  - focused no-current-poll-snapshot direct issue-by-id regression
  - focused current-poll terminal snapshot passive/reopened regressions
  - focused map-missing terminal snapshot regression
  - focused CO-529 Backlog released `not_active` direct issue-by-id regression
  - focused CO-521 Backlog released `not_active` no-current-poll passive-verification and active direct issue-by-id regressions
  - focused CO-520 Backlog released `not_active` stale blocker-snapshot passive-verification regression
  - focused CO-522 stale retained merged-closeout passive/current-promotion/reopened/live-Done regressions
  - focused accepted pending-revalidation no-current-poll regression
  - focused stale/current `review_promotion` regressions
  - focused active stuck refresh test
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run pack:smoke`
  - standalone review and elegance pass, or exact blocker
- Rollback plan:
  - revert the classification change and tests if active stuck refresh fail-closed behavior regresses, then leave CO-571 blocked with the failing evidence instead of weakening health truth.

## Risks & Mitigations
- Risk: terminal released claim filtering hides real active worker stalls.
  - Mitigation: require an active stuck negative regression that still fails closed.
- Risk: the selected released terminal claim still contributes to retrying WIP through a stale projection path.
  - Mitigation: require a retry projection consistency regression while preserving separate real retrying claims.
- Risk: the fix deletes audit evidence to make status look clean.
  - Mitigation: non-goal and tests require retained released claims to remain historical evidence.
- Risk: status surfaces fabricate healthy state after endpoint timeout.
  - Mitigation: keep `/ui/data.json` and `co-status --format json` truthfulness acceptance explicit.
- Risk: classification logic is duplicated across source and supervision surfaces.
  - Mitigation: inspect authority first and centralize only as much as needed for the smallest correct fix.

## Approvals
- Reviewer: CO-571 provider worker.
- Date: 2026-05-20.
