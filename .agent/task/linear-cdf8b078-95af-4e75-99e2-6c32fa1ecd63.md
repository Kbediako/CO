# Agent Task Mirror - linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63

- Linear Issue: `CO-571` / `cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- Task registry id: `20260520-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- Primary checklist: `tasks/tasks-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- PRD: `docs/PRD-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- TECH_SPEC: `tasks/specs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`

## Agent-Facing Scope
- [x] Preserve protected terms: `provider_refresh_lifecycle_stuck`, `restart_required`, `refresh:claim_issue_by_id_reconcile`, `claim_issue_by_id:released`, `refresh:claim_reconcile`, `claim_reconcile:released`, released terminal historical claims, CO-472, CO-461, CO-469, CO-471, CO-476, CO-451, CO-468, no active workers/WIP 0/3, `retrying=1` projection mismatch, no fabricated coherent snapshot, and no provider-intake manual edits.
- [x] Preserve rework protected terms: no-current-poll-snapshot path, direct issue-by-id fallback, accepted `provider_issue_rehydration_pending_revalidation`, stale `review_promotion`, and current promotion revalidation across no-map and deferred-poll fail-closed paths.
- [x] Preserve second-rework protected terms: current-poll terminal snapshot, CO-482, CO-478, equal-or-newer terminal `provider_issue_released:not_active`, no `claim_reconcile:released` progress for passive history, and active/reopened relaunch.
- [x] Preserve third-rework protected terms: map-missing current poll terminal history, CO-480, `linear:3abba033-52f0-45f3-af58-cce4939f087f`, completed/canceled issue filtering, no `claim_reconcile:released` progress for strong map-missing terminal history, and live-worker/current-promotion/blocker-refresh revalidation.
- [x] Keep CO-469 Duplicate/canceled inside terminal released historical claim scope, not as a separate queue-capacity or workflow-state redesign.
- [x] Keep CO-471 retry projection mismatch inside terminal released historical claim scope: selected released claim with null retry metadata must not manufacture retrying WIP, while separate real retrying claims remain visible.
- [x] Preserve genuine active refresh stall fail-closed behavior.
- [x] Preserve `co-status --format json` and `/ui/data.json` truthfulness.
- [x] Preserve `provider-intake-state.json` as audit evidence; do not manually edit or delete it.

## CO-382 Fallback Decision Table
- Large-refactor decision: start narrow at the provider refresh lifecycle classification authority. Consolidate only if inspection proves duplicate predicates across health/status surfaces would otherwise diverge.
- Minor-seam decision: acceptable because CO-571 removes a specific terminal-released-claim false restart path while retaining audit evidence and preserving active-stall fail-closed behavior.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider refresh lifecycle classification | Terminal released historical claims can escalate to active stuck refresh health. | `remove fallback` | CO-571 | Released terminal claim with no active run/retry/worker corroboration, including no-current-poll-snapshot direct issue-by-id fallback, current-poll terminal `not_active` snapshots, and map-missing terminal `not_active` rows filtered out of the current poll map. | Observed 2026-05-20 | 2026-05-20 | This issue | Terminal released claims stop driving `restart_required`. | Focused released-claim, no-snapshot, current-poll terminal, map-missing terminal, stale-promotion, and active-stall regressions. |
| Provider-intake history | Released historical claims stay retained for traceability. | `justify retaining fallback` | Provider-intake audit contract / CO-571 | Terminal issue release records historical claim state. | Existing behavior before CO-571 | 2026-05-20 | Non-expiring durable retention only with rationale | Separate approved audit-history redesign replaces retained claim history with equivalent source-labeled evidence. | Tests keep claims inactive without deleting evidence. |

- Contract name: provider-intake released historical claim audit retention.
- Owning surface: provider-intake state and control-host status/read models.
- Steady-state proof: raw released claim rows remain source-labeled audit evidence, while terminal released `not_active` claims with complete cached metadata, null retry fields, and no active or cancelable retained run do not drive `restart_required` or retrying WIP.
- Tests/docs: `ProviderIssueHandoff.test.ts` terminal released metadata-only table, no-current-poll-snapshot regression, current-poll terminal snapshot regression, map-missing terminal snapshot regression, accepted pending-revalidation no-current-poll regression, stale/current `review_promotion` regressions, active-stuck regression, `ControlRuntime.test.ts` retry projection regression, and this CO-571 packet.
- Non-expiring rationale: retained released claim history is durable operator/audit evidence, not temporary compatibility debt; removal requires an approved archival redesign that preserves equivalent source-labeled claim/run evidence.

## Validation Snapshot
- [x] Live `linear issue-context` read.
- [x] Single workpad created.
- [x] Exactly one same-turn `linear parallelization` decision recorded: `stay_serial` / `single_bounded_change`.
- [x] Docs packet created for PRD, TECH_SPEC, ACTION_PLAN, task checklist, and mirror.
- [x] Registry JSON updated and parsed. Evidence: `json ok` for `tasks/index.json` and `docs/docs-freshness-registry.json`.
- [x] Docs-review succeeded. Evidence: `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T18-03-32-648Z-cec26c42/manifest.json`.
- [x] Implementation and focused regressions completed for released terminal history, retry projection, and active stuck refresh.
- [x] Validation completed: spec guard, build, lint, focused tests, diagnostics child `npm test`, docs gates, diff budget, delegation guard, repo stewardship, pack smoke, and enforced standalone review.
- [x] Review/elegance completed. Evidence: enforced `gpt-5.5/xhigh` review returned `overall_verdict=clean`; post-review minimality pass kept the scoped predicate/test shape unchanged.
- [x] Draft PR opened. Evidence: PR #855, `https://github.com/Kbediako/CO/pull/855`.
- [x] Rework PR opened after PR #855 merged but live main still looped. Evidence: PR #856, `https://github.com/Kbediako/CO/pull/856`.
- [x] Manual Codex review triggered for PR #856 head `60055e3aabd8f69f5e916036204756da9bfac63e`; Codex returned clean.
- [x] PR #856 merged, then live current-main proof failed on current-poll `claim_reconcile:released`; CO-571 reopened to Rework with workpad `0a8af160-7715-499f-a6cc-4ac6249d711b`.
- [x] Second-rework focused and full `ProviderIssueHandoff.test.ts` passed for current-poll passive/reopened coverage.
- [x] Second-rework repeated `ControlRuntime.test.ts` full-suite timeout classified with GPT Pro as P2 test-harness / suite-performance flake, then fixed by splitting duplicate/ambiguous git-heavy cases into separate parameterized tests.
- [x] Second-rework validation gate completed: spec guard, build, lint, full `npm run test`, `ControlRuntime.test.ts` focused/containing-file reruns, docs gates, repo stewardship, `git diff --check`, and diff budget.
- [x] Second-rework enforced `gpt-5.5/xhigh` review completed clean. Evidence: `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T23-08-01-403Z-bf3480a0/review/output.log`.
- [x] Third-rework implementation and enforced `gpt-5.5/xhigh` review completed clean before PR #858. Evidence: commit `073b3e8160d515b5a25e85ff28e8b62d08d8c85e` and `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T23-58-56-762Z-51dae406/review/output.log`.
- [ ] Third-rework base-bound CI spec-guard rework, PR #858 update, GitHub check monitoring, merge, and live current-main proof pending.
