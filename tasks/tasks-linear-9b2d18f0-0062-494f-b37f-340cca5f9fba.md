# Task Checklist - CO-582

## Docs-First
- [x] PRD, canonical spec, TECH_SPEC mirror, ACTION_PLAN, task checklist, and agent mirror exist for `linear-9b2d18f0-0062-494f-b37f-340cca5f9fba`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the CO-582 packet.
- [x] Protected terms are visible: `docs:freshness:maintain`, `canonical_owner_issues[]`, `canonical_owner_key`, `active_owner`, `retired_historical`, `restore_existing_owner`, `move_to_backlog_not_done`, `owner_finalizer`, `pass_with_owned_rolling_debt`, `block_unowned_repo_debt`, `CO-581`, `CO-569`, `CO-579`, `CO-568`, and `PR #885`.

## Decomposition
- [x] Same-turn decomposition matrix recorded in `docs/ACTION_PLAN-linear-9b2d18f0-0062-494f-b37f-340cca5f9fba.md`.
- [x] Exactly one parallelization decision recorded: `stay_serial_after_degraded_delegate_spawn`.
- [x] Diagnostics child run completed and evidence recorded. Evidence: `.runs/linear-9b2d18f0-0062-494f-b37f-340cca5f9fba-scout-r2/cli/2026-05-26T00-47-55-318Z-5b57c1a9/manifest.json`.
- [x] Docs-review completed before implementation. Evidence: `.runs/linear-9b2d18f0-0062-494f-b37f-340cca5f9fba-docs-review/cli/2026-05-26T00-53-04-346Z-48676e02/manifest.json` (`docs:freshness:maintain` failed on expected pre-implementation terminal CO-579 owner evidence).

## Acceptance
- [x] Owner binding metadata distinguishes `active_owner`, `retiring`, and `retired_historical`.
- [x] Terminal same-project `active_owner` emits `restore_existing_owner` / `move_to_backlog_not_done`, not replacement-owner `create_required`, unless restoration is impossible.
- [x] Live same-project Backlog exact owner permits `pass_with_owned_rolling_debt` only within retained window and capacity.
- [x] Expired retained exception still blocks regardless of live owner state.
- [x] Registry row status remains document lifecycle only.
- [x] Merge closeout prevents or repairs active owner issues that would otherwise end in `Done`.
- [x] PR automation no longer treats active owner issues as closing deliverables.
- [x] CO-569 and CO-581 exact owner mappings remain isolated.

## Not Done If
- A merged owner PR can still close an active owner issue to `Done` while candidate cohorts resolve to it.
- A terminal same-project active owner still emits only `create_required` when restoration is possible.
- Exact owner mappings for CO-581 and CO-569 leak across cohorts.
- Backlog owner bindings count as active provider-worker WIP without actual repair/archive/reclassification work.

## Validation
- [x] JSON parse for `tasks/index.json`, `docs/docs-freshness-registry.json`, and `docs/docs-catalog.json`. Evidence: post-implementation `json ok`.
- [x] Protected-term scan over packet files. Evidence: pre-implementation protected-term `rg` scan covered all required packet files.
- [x] `git diff --check`. Evidence: post-implementation scoped `git diff --check` passed.
- [x] `node scripts/delegation-guard.mjs --task linear-9b2d18f0-0062-494f-b37f-340cca5f9fba`. Evidence: passed with 7 task-scoped subagent manifests; an initial bare invocation failed because task id was required.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed after stale active spec reclassification.
- [x] Focused vitest coverage for owner lifecycle routing. Evidence: `npx vitest run tests/docs-freshness-maintain.spec.ts --reporter=dot` (`84` passed) and `npx vitest run orchestrator/tests/ProviderMergeCloseout.test.ts --reporter=dot` (`70` passed).
- [x] `npm run build`. Evidence: passed.
- [x] `npm run lint`. Evidence: passed with three pre-existing `no-explicit-any` warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run test`. Evidence: post-main rerun passed `367` files / `6389` tests.
- [x] `npm run docs:check`. Evidence: initial archive-stub audit failure was root-caused to generated out-of-scope stale-spec side edits and reverted; rerun passed `docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: post-main rerun passed with `5667` docs, `5671` registry entries, `0` stale entries, and `0` terminal lifecycle entries; report `out/linear-9b2d18f0-0062-494f-b37f-340cca5f9fba-post-main/docs-freshness.json`.
- [x] `npm run docs:freshness:maintain -- --format json`. Evidence: post-main rerun passed with `freshness_decision=clean`, `blocks_handoff=false`, `candidate_entries=0`, and `blocking_changed_paths=[]`; report `out/linear-9b2d18f0-0062-494f-b37f-340cca5f9fba-post-main/docs-freshness-maintain.json`.
- [x] `npm run repo:stewardship`. Evidence: post-main rerun passed; `6816` tracked files, `0` action-required.
- [x] `node scripts/diff-budget.mjs`. Evidence: exceeded budget (`1687 > 1200`) and passed with `DIFF_BUDGET_OVERRIDE_REASON` for the owner-lifecycle root-cause diff.
- [x] `npm run pack:smoke`. Evidence: passed; package smoke ended with `pack smoke passed`.
- [x] Standalone review / review waiver evidence. Evidence: wrapper launched with diff-budget and large-scope overrides, then Codex review failed on usage quota (`try again at May 31st, 2026 7:51 AM`); telemetry saved at `.runs/linear-9b2d18f0-0062-494f-b37f-340cca5f9fba/cli/2026-05-26T00-52-30-190Z-4c44329f/review/telemetry.json`, and waiver evidence is recorded at `out/linear-9b2d18f0-0062-494f-b37f-340cca5f9fba/manual/20260526T053217Z-review-quota-waiver.md`.

## Notes
- 2026-05-26: Current maintainer output proves CO-569 and CO-581 are still live Blocked exact rolling owners; CO-579 has been restored to Backlog and no longer blocks owner finalization.
- 2026-05-26: `delegate.spawn` transport closed; implementation remains parent-owned and diagnostics child evidence will be used where available.
- 2026-05-26: Post-implementation maintainer dry-run emits `restore_existing_owner` / `move_to_backlog_not_done` for terminal same-project active owner `CO-579`, with target state `Backlog`, while retaining live exact owners `CO-569` and `CO-581`.
- 2026-05-26: Applied audited CO-579 restore action: `./bin/codex-orchestrator.js linear transition --issue-id CO-579 --expected-state "Done" --expected-state-type completed --expected-updated-at 2026-05-25T09:22:28.942Z --state "Backlog" --force --force-reason "restore active docs freshness owner; move_to_backlog_not_done" --format json`; result updated CO-579 to `Backlog` / `backlog` at `2026-05-26T01:10:02.659Z`.
- 2026-05-26: Maintainer after restore: `npm --silent run docs:freshness:maintain -- --format json --dry-run-linear-actions --warn --report out/linear-9b2d18f0-0062-494f-b37f-340cca5f9fba/co582-docs-freshness-maintain-after-restore.json` reports `owner_issue=CO-579`, `owner_issue_action.mode=update_existing`, owner state `Backlog` / `backlog`, `owner_finalizer.status=passed_exact_canonical_owner_precedence`, and active owners `CO-569`, `CO-579`, `CO-581`.
- 2026-05-26: Root-caused and reverted generated out-of-scope stale-spec side edits for CO-498/CO-442/CO-460/CO-453 after `docs:check` caught invalid archive-stub metadata; CO-582 no longer changes those specs or registry rows.
- 2026-05-26: PR #898 merged and cleared the external `CO-569` / `CO-581` / `CO-579` retained freshness debt; CO-582 is live `In Progress`, post-main `docs:freshness` / `docs:freshness:maintain` are clean, and the remaining review gap is Codex quota with waiver evidence recorded.
