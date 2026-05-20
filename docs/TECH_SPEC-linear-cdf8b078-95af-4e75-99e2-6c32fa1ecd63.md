---
id: 20260520-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63
title: CO-571 released terminal claim reconciliation restart loop
relates_to: docs/PRD-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md
risk: high
owners:
  - Codex
last_review: 2026-05-20
related_action_plan: docs/ACTION_PLAN-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md
task_checklists:
  - tasks/tasks-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md
---

# TECH_SPEC Mirror - CO-571 released terminal claim reconciliation restart loop

Canonical spec: `tasks/specs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`; PRD: `docs/PRD-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`; action plan: `docs/ACTION_PLAN-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.

## Contract
CO-571 fixes provider refresh lifecycle classification for retained released terminal historical claims. `claim_issue_by_id:released` and `claim_reconcile:released` records for terminal Done or Duplicate/canceled issues with retry fields null and no active worker/live issue corroboration remain audit-visible but must not drive `provider_refresh_lifecycle_stuck` / `restart_required` when WIP is `0/3` or when a selected released claim is inconsistently projected as retrying. This includes both `run_id=null` claims and non-cancellable historical run_id/run_manifest_path bindings. PR #856 extends the contract to the no-current-poll-snapshot path: a strong terminal released row must not fall through to direct issue-by-id only because `resolveTrackedIssues` skipped or was unavailable, while accepted `provider_issue_rehydration_pending_revalidation` claims must still revalidate. Retained `review_promotion` metadata is stale only when newer terminal issue truth supersedes it; current promotion metadata must still revalidate, including deferred-poll fail-closed paths. Real active refresh stalls must still fail closed with provider keys and phase evidence.

## Protected Evidence
- CO-472 Done: `refresh:claim_issue_by_id_reconcile` / `claim_issue_by_id:released`, provider key `linear:590e4e09-315a-4957-bb72-66b8322e86a6`.
- CO-461 Done: `refresh:claim_reconcile` / `claim_reconcile:released`, provider key `linear:8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc`.
- CO-469 Duplicate/canceled: `refresh:claim_issue_by_id_reconcile` / `claim_issue_by_id:released`, provider key `linear:e1ecc66e-4733-4b89-8030-f626607e0284`.
- CO-471 Done: `refresh:claim_reconcile` / `claim_reconcile:released`, provider key `linear:93f80950-06e5-41f2-9186-f4877e69f563`; parent evidence reported `counts running=0 retrying=1 max_allowed=3` while the selected released claim had `run_id=null` and all retry fields null.
- CO-476 Duplicate/canceled: `refresh:claim_issue_by_id_reconcile` / `claim_issue_by_id:released`, provider key `linear:d7000137-f984-4275-85a0-dc5c14f09e64`, `run_id=null`, `run_manifest_path=null`, and all retry fields null.
- CO-451 Done/completed: `claim_issue_by_id:released`, provider key `linear:a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7`, retained `run_id=2026-05-01T16-41-57-405Z-39b1234f`, retained run manifest path, and all retry fields null.
- CO-468 Done/completed: after parent restarted the supervised control-host onto current main `2c0d4667f03f1890a4c9aa3197ddfba2c8fb9657` to clear stale_supervised_source_root, the loop reproduced at `refresh:claim_issue_by_id_reconcile` / `claim_issue_by_id:released`, provider key `linear:6d7e842c-b10a-42f5-a7e0-8a30a8dd9442`, retained `run_id=2026-05-02T12-19-43-274Z-d95c88ea`, retained run manifest path, and all retry fields null. This restart is evidence only, not the CO-571 fix.
- PR #855 follow-up evidence: current main still looped through `claim_issue_by_id:released` when no current poll map existed, so normalization alone was partial. The rework must stop strong terminal released history before direct issue-by-id and must cover stale/current `review_promotion` behavior.
- Non-goals: no fabricated coherent snapshot, no provider-intake manual edits, no timeout-only increase, no one-off restart workaround.

## Not Done If
- Released terminal historical claims can still trigger `restart_required` without active worker/live issue corroboration.
- A selected released terminal claim with null retry metadata can still be counted as retrying work.
- Active stuck refresh paths no longer fail closed.
- `co-status --format json` or `/ui/data.json` hides a real unhealthy host or fabricates a healthy snapshot after timeout.
- No-current-poll-snapshot terminal history still enters direct issue-by-id.
- Stale retained `review_promotion` keeps terminal released history active, or current promotion metadata is hidden.
- Provider-intake audit history is deleted or manually edited to clear the loop.

## Validation
Implementation must add focused coverage for both released terminal claim paths, the Duplicate/canceled terminal example, the selected-claim retry projection mismatch, the no-current-poll-snapshot path before direct issue-by-id, accepted pending-revalidation rechecks, and stale/current `review_promotion` classification across no-map and deferred-poll fail-closed paths. It must also keep a real active/stuck path failing closed. Required gates include spec guard, build, lint, test, docs checks, freshness, diff budget, pack smoke for downstream control-host behavior, and review/elegance evidence where feasible.

## CO-382 Fallback Decision Table
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove the fallback where terminal released historical claim reconciliation is treated as active stuck refresh health.
- Retention decision: retain provider-intake released historical claims as audit evidence, not as active work authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider refresh lifecycle classification | Terminal released historical claims can escalate to active stuck refresh health. | remove fallback | CO-571 | Released terminal claim with no active run/retry/worker corroboration, including no-current-poll-snapshot direct issue-by-id fallback. | Observed 2026-05-20 | 2026-05-20 | This issue | Terminal released claims stop driving `restart_required`. | Focused released-claim, no-snapshot, stale-promotion, and active-stall regressions. |
| Provider-intake history | Released historical claims stay retained for traceability. | justify retaining fallback | Provider-intake audit contract / CO-571 | Terminal issue release records historical claim state. | Existing behavior before CO-571 | 2026-05-20 | Non-expiring durable retention only with rationale | Separate approved audit-history redesign replaces retained claim history with equivalent source-labeled evidence. | Tests keep claims inactive without deleting evidence. |

- Contract name: provider-intake released historical claim audit retention.
- Owning surface: provider-intake state and control-host status/read models.
- Steady-state proof: raw released claim rows remain source-labeled audit evidence, while terminal released `not_active` claims with complete cached metadata, null retry fields, and no active or cancelable retained run do not drive `restart_required` or retrying WIP.
- Tests/docs: `ProviderIssueHandoff.test.ts` terminal released metadata-only table, no-current-poll-snapshot regression, accepted pending-revalidation no-current-poll regression, stale/current `review_promotion` regressions, active-stuck regression, `ControlRuntime.test.ts` retry projection regression, and this CO-571 packet.
- Non-expiring rationale: retained released claim history is durable operator/audit evidence, not temporary compatibility debt; removal requires an approved archival redesign that preserves equivalent source-labeled claim/run evidence.
