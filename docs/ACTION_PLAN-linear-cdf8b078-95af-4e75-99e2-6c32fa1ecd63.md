# ACTION_PLAN - CO-571 released terminal claim reconciliation restart loop

## Summary
- Goal: stop retained released terminal historical claims from repeatedly driving control-host `provider_refresh_lifecycle_stuck` / `restart_required` when WIP is `0/3`, while preserving real active-stall fail-closed behavior.
- Scope: provider refresh lifecycle classification, released claim reconciliation, terminal Done and Duplicate/canceled issue truth, status truth, tests, validation, and PR handoff.
- Assumptions:
  - CO-556 source freshness policy already landed on `origin/main` `da785a065d79d9680e189368ce24aafe2cd96178`.
  - CO-472, CO-461, CO-469, CO-471, CO-476, CO-451, and CO-468 are terminal released historical claims, not current active workers.
  - `provider-intake-state.json` remains audit evidence and is not a manual repair target.

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
- Pre-implementation issue-quality review:
  - 2026-05-20: CO-571 is a narrow root-cause lane for released terminal historical claim reconciliation. CO-469 Duplicate/canceled and CO-471 Done are included because both are terminal released history with null run/retry fields, not new active-work behaviors.
- Fallback / refactor decision:
  - This task touches retained historical/cached provider-intake evidence. Decision: `remove fallback` for terminal released claims being treated as active stuck refresh health; retain historical claim records as supported audit evidence.
- Durable retention evidence:
  - Provider-intake released claim records remain traceability evidence. Tests should prove they are inactive for restart decisions without deleting the evidence.
- Large-refactor check: start with a narrow classification authority fix. Escalate to a shared helper only if source inspection finds duplicated terminal-claim predicates across health/status surfaces.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider refresh lifecycle classification | Terminal released historical claims can still be interpreted as active stuck refresh evidence. | remove fallback | CO-571 | `claim_issue_by_id:released` or `claim_reconcile:released` with terminal issue truth and no active run/retry/worker corroboration. | Observed 2026-05-20 | 2026-05-20 | This issue | Terminal released claims stop driving `restart_required` while active stalls still fail closed. | Focused released-claim and active-stall regressions. |
| Retained released claim audit history | Released historical claims remain in `provider-intake-state.json`. | justify retaining fallback | Provider-intake audit contract / CO-571 | Terminal issue release leaves historical claim evidence for operator traceability. | Existing behavior before CO-571 | 2026-05-20 | Non-expiring durable retention only with rationale | Separate approved audit-history redesign replaces retained claim history with equivalent source-labeled evidence. | Tests keep terminal claims inactive without deleting evidence. |

- Contract name: provider-intake released historical claim audit retention.
- Owning surface: provider-intake state and control-host status/read models.
- Steady-state proof: raw released claim rows remain source-labeled audit evidence, while terminal released `not_active` claims with complete cached metadata, null retry fields, and no active or cancelable retained run do not drive `restart_required` or retrying WIP.
- Tests/docs: `ProviderIssueHandoff.test.ts` terminal released metadata-only table, active-stuck regression, `ControlRuntime.test.ts` retry projection regression, and this CO-571 packet.
- Non-expiring rationale: retained released claim history is durable operator/audit evidence, not temporary compatibility debt; removal requires an approved archival redesign that preserves equivalent source-labeled claim/run evidence.

## Milestones & Sequencing
1. Register the CO-571 docs-first packet: PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, `.agent/task` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Run docs-review or record exact blocker before implementation.
3. Inspect provider refresh lifecycle authority around `providerIssueHandoff`, provider polling health, and control-host supervision/status projection.
4. Add focused failing regressions for CO-472 / CO-469 `claim_issue_by_id:released`, CO-461 / CO-471 `claim_reconcile:released`, selected-claim retry projection, and a real active stuck path.
5. Implement the smallest classification fix at the authority seam.
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
