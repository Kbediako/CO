# Task Checklist - CO-571 released terminal claim reconciliation restart loop

- Linear Issue: `CO-571` / `cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- Task registry id: `20260520-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- MCP Task ID: `linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- Primary PRD: `docs/PRD-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- TECH_SPEC: `tasks/specs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- Agent task mirror: `.agent/task/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- Canonical owner key: `control-host:released-claim-reconcile-restart-loop`
- Workpad comment: `e7bfc570-8142-462c-8ab3-b852c50e3187`
- Rework workpad comment: `f1814ce7-2a75-480b-ac58-de341c820504`
- Post-merge rework workpad comment: `0a8af160-7715-499f-a6cc-4ac6249d711b`
- Latest-main Backlog rework: parent-owned Linear/GitHub lifecycle; worker branch only.
- Latest-main retained merged-closeout rework: parent-owned Linear/GitHub lifecycle; worker branch only.
- Latest-main no-poll Backlog rework: parent-owned Linear/GitHub lifecycle; worker branch only.
- Latest-main stale blocker-snapshot rework: parent-owned Linear/GitHub lifecycle; worker branch only.
- Latest-main passive-proof budget rework: parent-owned Linear/GitHub lifecycle; worker branch only.

## Workflow Setup
- [x] Live `linear issue-context` read for CO-571. Evidence: helper output on 2026-05-20 confirmed `In Progress`, no current PR, and no existing workpad.
- [x] Single `## Codex Workpad` created. Evidence: Linear comment `e7bfc570-8142-462c-8ab3-b852c50e3187`.
- [x] Decomposition matrix recorded in workpad before parallelization.
- [x] Exactly one `linear parallelization` decision recorded. Evidence: `stay_serial` / `single_bounded_change` with docs/test/research/review summary on 2026-05-20.

## Docs-First
- [x] PRD created with user-request translation, protected terms, parity matrix, non-goals, Not Done If, acceptance criteria, validation plan, and fallback/refactor decision. Evidence: `docs/PRD-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] Canonical TECH_SPEC created under `tasks/specs/`. Evidence: `tasks/specs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] TECH_SPEC mirror created under `docs/`. Evidence: `docs/TECH_SPEC-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] ACTION_PLAN created. Evidence: `docs/ACTION_PLAN-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] Task checklist created. Evidence: `tasks/tasks-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] Task registration updated in canonical `tasks/index.json`. Evidence: `tasks/index.json`.
- [x] Task snapshot updated in `docs/TASKS.md`. Evidence: `docs/TASKS.md`.
- [x] Docs freshness registry updated for packet/checklist/mirror files. Evidence: `docs/docs-freshness-registry.json`.
- [x] `.agent/task` mirror created. Evidence: `.agent/task/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] Docs-review run or exact blocker recorded before implementation. Evidence: `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T18-03-32-648Z-cec26c42/manifest.json` succeeded.

## Protected Issue Terms
- [x] `provider_refresh_lifecycle_stuck`
- [x] `restart_required`
- [x] `refresh:claim_issue_by_id_reconcile`
- [x] `claim_issue_by_id:released`
- [x] `refresh:claim_reconcile`
- [x] `claim_reconcile:released`
- [x] released terminal historical claims
- [x] CO-472
- [x] CO-461
- [x] CO-469
- [x] CO-471
- [x] CO-476
- [x] CO-451
- [x] CO-468
- [x] no active workers/WIP 0/3
- [x] `retrying=1` projection mismatch
- [x] no-current-poll-snapshot path
- [x] current-poll terminal snapshot path
- [x] map-missing current poll terminal history
- [x] CO-529 Backlog/backlog released `not_active`
- [x] CO-521/CO-524 Backlog/backlog released `not_active` when current poll snapshot is unavailable
- [x] CO-522 retained merged-closeout released `not_active`
- [x] PR #795 merged
- [x] live Linear Done/completed
- [x] stale `review_promotion`
- [x] no fabricated coherent snapshot
- [x] no provider-intake manual edits

## Wrong Interpretations Rejected
- [x] timeout-only increase
- [x] provider-intake manual edits
- [x] one-off restart as the fix
- [x] treating all `/ui/data.json` timeouts as healthy
- [x] clearing genuine active refresh stalls
- [x] deleting released historical claim evidence
- [x] broadening into quota hygiene or unrelated capacity work
- [x] relying on retry-field normalization only
- [x] treating the no-current-poll fix as sufficient when the current poll map reconfirms terminal history
- [x] treating the current-poll-present fix as sufficient when completed/canceled issue filtering leaves terminal history map-missing
- [x] treating passive Backlog/not_active as the same as Blocked, retry, pending-review, merge-closeout, or reopened work
- [x] treating stale retained merged-closeout history as active authority after current poll omission, merged PR proof, and live Linear Done/completed truth

## Acceptance Criteria
- [x] CO-472 Done `claim_issue_by_id:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] CO-461 Done `claim_reconcile:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] CO-469 Duplicate/canceled `claim_issue_by_id:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] CO-471 Done `claim_reconcile:released` terminal path does not drive restart-required health without active corroboration and does not manufacture retrying WIP from null retry metadata. Evidence: `npm run test -- ProviderIssueHandoff.test.ts` and `npm run test -- ControlRuntime.test.ts`.
- [x] CO-476 Duplicate/canceled `claim_issue_by_id:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] CO-451 Done `claim_issue_by_id:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] CO-468 Done `claim_issue_by_id:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] No-current-poll-snapshot terminal released path skips direct issue-by-id for strong terminal history. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] Current-poll terminal released path remains passive before `claim_reconcile:released` progress or claim churn when the poll map reconfirms terminal `not_active` truth. Evidence: `npm run test -- ProviderIssueHandoff.test.ts -t "keeps current-poll terminal released history passive|reopens terminal released history when the current poll snapshot becomes active"`.
- [x] Map-missing terminal released path remains passive before `claim_reconcile:released` progress or claim churn when completed/canceled filtering leaves no current poll entry. Evidence: `npm run test -- ProviderIssueHandoff.test.ts -t "map-missing terminal released"`.
- [x] Current-poll active/reopened snapshot still relaunches. Evidence: `npm run test -- ProviderIssueHandoff.test.ts -t "reopens terminal released history when the current poll snapshot becomes active"`.
- [x] CO-529-style Backlog/backlog released `not_active` path skips direct issue-by-id and does not set restart-required health. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "keeps released Backlog not-active claims passive before direct issue-by-id"`.
- [x] CO-521-style Backlog/backlog released `not_active` path performs a bounded direct issue-by-id verification when the current poll snapshot is unavailable, records `passive_release` metadata for the same Backlog snapshot, skips repeated direct reads, revalidates stale exact-snapshot proof, and starts work if direct truth is active. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "Backlog not-active claims|large no-poll cohorts|blocker mismatches|issue-by-id is active|stale exact-snapshot passive proof"`.
- [x] CO-520-style stale blocker-snapshot Backlog/backlog released `not_active` path records `passive_release` metadata from direct own-issue truth, matching direct proof suppresses repeated reads despite stale blocker metadata, and does not start/resume work. Evidence: focused CO-571 neighborhood subset.
- [x] Large no-poll Backlog released cohorts use a bounded per-refresh direct proof budget, record `claim_issue_by_id:released_deferred` for deferred rows, progress deferred rows over later refreshes before stale proofs re-enter the budget, and never start work for verified passive rows. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "Backlog not-active claims|large no-poll cohorts|blocker mismatches|issue-by-id is active|stale exact-snapshot passive proof"` passed.
- [x] Eighth-rework full validation completed except unrelated docs freshness baseline. Evidence: focused Backlog/blocker/active-direct subset, full `ProviderIssueHandoff.test.ts`, spec guard, build, lint, full `npm run test` (366 files / 6140 tests), `docs:check`, repo stewardship, `git diff --check`, diff budget, pack smoke, delegation guard, JSON parse, and enforced `gpt-5.5/xhigh` review at `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63-guard/cli/2026-05-21T07-21-46-437Z-fe951f02/review/output.log`.
- [x] CO-522-style stale retained merged-closeout released path stays passive when current polling omits it, current promotion/reopened evidence still revalidates, and direct live Done truth clears stale `merge_closeout` residue. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "stale merged closeout|current retained promotion|live Done truth"`.
- [x] Accepted `provider_issue_rehydration_pending_revalidation` claims still revalidate through direct issue-by-id when current polling is unavailable. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] Stale retained `review_promotion` metadata is treated as historical only when newer terminal issue truth supersedes it, while current promotion metadata revalidates in no-map and deferred-poll fail-closed paths. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] Real active/stuck refresh path still fails closed with `provider_refresh_lifecycle_stuck` / `restart_required`. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] `co-status --format json` and `/ui/data.json` remain truthful with no fabricated coherent snapshot. Evidence: `npm run test -- ControlRuntime.test.ts`.
- [x] No provider-intake manual edits, timeout-only fix, or one-off restart workaround. Evidence: implementation diff only changes classification/tests/docs.

## Validation
- [x] Docs-review manifest or exact blocker. Evidence: `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T18-03-32-648Z-cec26c42/manifest.json` succeeded.
- [x] Registry JSON parse check. Evidence: `node -e "JSON.parse(...tasks/index.json...); JSON.parse(...docs/docs-freshness-registry.json...)"` returned `json ok`.
- [x] Protected-term scan over declared CO-571 packet files. Evidence: scoped `rg` found CO-571, CO-472, CO-461, CO-469, CO-471, CO-476, CO-451, CO-468, `provider_refresh_lifecycle_stuck`, `restart_required`, released-claim phases, `retrying=1`, `no fabricated coherent snapshot`, and `no provider-intake manual edits`.
- [x] Scoped whitespace/diff check. Evidence: `git diff --check -- <declared CO-571 docs and registry files>` exited 0.
- [x] Focused released terminal claim regressions. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] Focused retry projection consistency regression for released terminal claims with null retry fields. Evidence: `npm run test -- ControlRuntime.test.ts`.
- [x] Focused no-current-poll-snapshot regression. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] Focused current-poll terminal passive/reopened regression. Evidence: focused pair and full `ProviderIssueHandoff.test.ts` passed in post-merge rework worktree.
- [x] Focused map-missing terminal passive regression. Evidence: `npm run test -- ProviderIssueHandoff.test.ts -t "map-missing terminal released"` passed in third-rework worktree.
- [x] Focused accepted pending-revalidation no-current-poll regression. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] Focused stale/current `review_promotion` regressions, including deferred-poll stale suppression and current-promotion revalidation. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] Focused active stuck refresh regression. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] Repeated full-suite timeout classified and hardened without product-code widening. Evidence: GPT Pro consultation classified the repeated `ControlRuntime.test.ts` timeout as P2 test-harness / suite-performance flake; `npm run test -- ControlRuntime.test.ts -t "falls back to persisted stale authority when"` passed twice after splitting the duplicate/ambiguous cases.
- [x] `node scripts/spec-guard.mjs --dry-run`.
- [x] `npm run build`.
- [x] `npm run lint`. Evidence: passed with existing `DelegationMcpHealth.test.ts` warnings only.
- [x] `npm run test`. Evidence: diagnostics child run `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63-guard/cli/2026-05-20T18-34-04-472Z-7b15b709/manifest.json` succeeded.
- [x] Second-rework `npm run test`. Evidence: full suite passed after current-poll classifier and `ControlRuntime.test.ts` test-harness split: 366 files, 6130 tests.
- [x] `npm run docs:check`.
- [ ] `npm run docs:freshness`. Evidence: current eighth-rework run failed on unrelated CO-558 rolling cohort baseline debt (`257` stale docs, `199` rolling cohort entries); this is not caused by the CO-571 diff.
- [x] `npm run repo:stewardship`.
- [x] `git diff --check`.
- [x] `node scripts/diff-budget.mjs`.
- [x] `npm run pack:smoke`.
- [x] Standalone review and elegance pass, or exact blocker recorded. Evidence: enforced `gpt-5.5/xhigh` review at `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T18-03-32-648Z-cec26c42/review/output.log` returned `overall_verdict=clean`; post-review minimality pass kept the scoped predicate/test shape unchanged.
- [x] Second-rework standalone review. Evidence: enforced `gpt-5.5/xhigh` review at `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T23-08-01-403Z-bf3480a0/review/output.log` returned `overall_verdict=clean` and `review contract: mode=enforce, validation=valid, overall=clean`.
- [x] Fifth-rework full validation. Evidence: focused stale merged-closeout subset, full `ProviderIssueHandoff.test.ts`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, full `npm run test` (366 files / 6136 tests), `npm run docs:check`, `npm run repo:stewardship`, `git diff --check`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke` passed.
- [x] Fifth-rework enforced standalone review. Evidence: `gpt-5.5/xhigh` review at `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-21T01-29-57-573Z-6c459571/review/output.log` returned `overall_verdict=clean`, `review contract: mode=enforce, validation=valid, overall=clean`.
- [x] Sixth-rework full validation. Evidence: focused failing-then-passing CO-521 no-current-poll Backlog regression, focused CO-571 neighborhood subset, full `ProviderIssueHandoff.test.ts`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, full `npm run test` (366 files / 6137 tests), `npm run docs:check`, `npm run repo:stewardship`, `git diff --check`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke` passed; `node scripts/delegation-guard.mjs` passed after repo-local guard stream `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63-guard/cli/2026-05-21T03-52-55-648Z-c10f6576/manifest.json`.
- [x] PR #861 Codex P1 rework. Evidence: focused passive-verification and active-direct regressions plus full `ProviderIssueHandoff.test.ts` passed after adding explicit `passive_release` metadata and direct issue-by-id source binding.
- [x] Seventh-rework focused stale blocker-snapshot regression. Evidence: focused CO-571 Backlog/blocker/active-direct subset passed after allowing direct own-issue Backlog proof to mark `passive_release` despite stale blocker metadata while bounded revalidation continues for blocker mismatches.
- [x] Seventh-rework full validation. Evidence: focused CO-571 Backlog/blocker/active-direct subset, full `ProviderIssueHandoff.test.ts`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, full `npm run test` (366 files / 6139 tests), `npm run docs:check`, `npm run repo:stewardship`, `git diff --check`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke` passed; `node scripts/delegation-guard.mjs --task linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63` passed after repo-local guard stream `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63-guard/cli/2026-05-21T05-26-07-730Z-a07953f0/manifest.json`.
- [x] Seventh-rework enforced standalone review and minimality pass. Evidence: `gpt-5.5/xhigh` review at `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63-guard/cli/2026-05-21T05-26-07-730Z-a07953f0/review/output.log` returned `overall_verdict=clean`, `review contract: mode=enforce, validation=valid, overall=clean`; post-review minimality pass kept the scoped predicate/test shape unchanged.
- [x] Sixth-rework enforced standalone review. Evidence: `gpt-5.5/xhigh` review at `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-21T03-58-15-767Z-aafcc6a4/review/output.log` returned `overall_verdict=clean`, `review contract: mode=enforce, validation=valid, overall=clean`.
- [x] Eighth-rework enforced standalone review and minimality pass. Evidence: first enforced review found a P2 time-only expiry starvation risk; final exact-snapshot proof patch and time-advanced large-cohort regression passed enforced `gpt-5.5/xhigh` review at `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63-guard/cli/2026-05-21T07-21-46-437Z-fe951f02/review/output.log` with `overall_verdict=clean`, `review contract: mode=enforce, validation=valid, overall=clean`.
- [x] PR #863 Codex P1 rework. Evidence: stale exact-snapshot passive proof revalidation was added after Codex flagged permanent no-poll suppression; focused CO-571 subset including `stale exact-snapshot passive proof` passed.
- [x] Draft PR opened and linked to CO-571. Evidence: PR #855, `https://github.com/Kbediako/CO/pull/855`.

## CO-382 Fallback Decision Table
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove fallback where terminal released historical claim reconciliation is treated as active stuck refresh health.
- Retention decision: provider-intake released historical claims remain audit evidence and are not deleted.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider refresh lifecycle classification | Terminal released historical claims can escalate to active stuck refresh health. | remove fallback | CO-571 | Released terminal claim with no active run/retry/worker corroboration, including no-current-poll-snapshot direct issue-by-id fallback, current-poll terminal `not_active` snapshots, and map-missing terminal `not_active` rows filtered out of the current poll map. | Observed 2026-05-20 | 2026-05-20 | This issue | Terminal released claims stop driving `restart_required`. | Focused released-claim, no-snapshot, current-poll terminal, map-missing terminal, stale-promotion, and active-stall regressions. |
| Passive Backlog released not_active classification | Parked Backlog released claims can escalate to direct issue-by-id stuck refresh health. | remove fallback | CO-571 | CO-529-style released `provider_issue_released:not_active` Backlog/backlog row with no active run, retry, promotion, merge-closeout, or cancelable retained-run evidence, including the CO-521/CO-524 no-current-poll-snapshot recurrence, CO-520 stale blocker-snapshot recurrence, and large no-poll Backlog released cohorts. | Observed 2026-05-21 | 2026-05-21 | This issue | Passive Backlog/not_active rows skip repeated direct issue-by-id only after matching explicit `passive_release` direct issue-by-id verification for the claim's own Backlog snapshot; matching direct proof wins over stale blocker metadata, unverified no-poll Backlog rows use a per-refresh direct-read budget with deferred progress, and active/reopened/pending-review/retry/Blocked/merge-closeout paths still revalidate or start work. | Focused CO-529 current-poll-omitted, CO-521 no-current-poll Backlog passive-verification, CO-520 stale blocker-snapshot regression, large no-poll Backlog cohort budgeting, and active direct issue-by-id regressions plus existing active/reopened/current-promotion/active-stall regressions. |
| Stale retained merged-closeout classification | Retained merged closeout metadata can escalate stale released history to direct issue-by-id stuck refresh health. | remove fallback | CO-571 | CO-522-style released `provider_issue_released:not_active` row with stale non-active issue metadata, merged PR proof, stale promotion metadata, null retry fields, and no active/cancelable run. | Observed 2026-05-21 | 2026-05-21 | This issue | Stale retained merged-closeout rows skip direct issue-by-id when current polling omits them, while current promotion/reopened/direct-live-Done normalization paths remain active. | Focused CO-522 stale merged-closeout regressions. |
| Provider-intake history | Released historical claims stay retained for traceability. | justify retaining fallback | Provider-intake audit contract / CO-571 | Terminal issue release records historical claim state. | Existing behavior before CO-571 | 2026-05-20 | Non-expiring durable retention only with rationale | Separate approved audit-history redesign replaces retained claim history with equivalent source-labeled evidence. | Tests keep claims inactive without deleting evidence. |

- Contract name: provider-intake released historical claim audit retention.
- Owning surface: provider-intake state and control-host status/read models.
- Steady-state proof: raw released claim rows remain source-labeled audit evidence, while strong terminal released `not_active` claims remain passive under the terminal-claim rules, and passive Backlog released `not_active` claims suppress repeated direct issue-by-id only when matching `passive_release` verification exists for the claim's own Backlog snapshot plus complete cached metadata, null retry fields, and no active or cancelable retained run; these rows do not drive `restart_required` or retrying WIP, including when the current poll snapshot is unavailable. Unverified no-poll Backlog rows are direct-read within a per-refresh budget, deferred rows remain visible until subsequent refreshes verify them, and stale exact-snapshot proof revalidates through the same budget.
- Tests/docs: `ProviderIssueHandoff.test.ts` terminal released metadata-only table, no-current-poll-snapshot regression, current-poll terminal snapshot regression, map-missing terminal snapshot regression, CO-529 Backlog regression, CO-521 no-current-poll Backlog passive-verification and active direct issue-by-id regressions, CO-520 stale blocker-snapshot regression, large no-poll Backlog cohort budgeting regression, stale exact-snapshot proof active revalidation regression, CO-522 stale retained merged-closeout regressions, accepted pending-revalidation no-current-poll regression, stale/current `review_promotion` regressions, active-stuck regression, `ControlRuntime.test.ts` retry projection regression, and this CO-571 packet.
- Non-expiring rationale: retained released claim history is durable operator/audit evidence, not temporary compatibility debt; removal requires an approved archival redesign that preserves equivalent source-labeled claim/run evidence.

## Progress Log
- 2026-05-20: Live issue-context read, initial workpad created, serial same-turn parallelization decision recorded, and docs-first packet started. Parent later supplied CO-469 Duplicate/canceled evidence and CO-471 Done retry-projection mismatch evidence; packet included both as terminal released historical claim scope.
- 2026-05-20: Implementation committed and draft PR #855 opened after focused validation, pack smoke, and enforced `gpt-5.5/xhigh` review returned clean.
- 2026-05-20: PR #855 merged, but live current-main evidence still looped on no-current-poll-snapshot `claim_issue_by_id:released`. CO-571 reopened to Rework and PR #856 updates the classifier before direct issue-by-id, with stale/current `review_promotion` regression coverage.
- 2026-05-21: PR #860 merged, but live latest-main evidence still looped on CO-521 and then CO-524 Backlog/backlog `claim_issue_by_id:released` when the current poll snapshot was unavailable. CO-571 reopened to Rework, and PR #861 review tightened the fix so no-poll Backlog passive classification requires explicit `passive_release` direct issue-by-id verification and active direct truth still starts work.
- 2026-05-21: PR #861 merged, but live latest-main evidence still looped on CO-520 because stale blocker metadata said Blocked/started while direct issue-by-id verified CO-520 itself was Backlog/backlog. Seventh rework let direct own-issue Backlog proof mark `passive_release` despite stale blocker snapshots, while active direct truth still starts work.
- 2026-05-21: PR #862 merged, but live current-source evidence at `afc33fe2ebbb24b62f44dc7fc7811ad0aba28029` still looped through released Backlog no-poll claim reconciliation for CO-521 and then CO-524. Eighth rework makes matching direct own-issue `passive_release` proof suppress repeated reads despite stale blocker metadata, bounds unverified no-poll Backlog direct reads per refresh with `claim_issue_by_id:released_deferred` progress that cannot be starved by time-only expiry of earlier exact-snapshot proofs, and revalidates stale exact-snapshot proof so active direct truth cannot stay hidden while polling is unavailable.
- 2026-05-20: PR #856 merged, but live current-main evidence still looped on current-poll `claim_reconcile:released` for terminal `not_active` history such as CO-482/CO-478. CO-571 reopened to Rework again; this branch updates the current-poll classifier before per-claim reconcile progress and adds passive/reopened regressions.
- 2026-05-20: Full-suite validation twice hit the same unrelated `ControlRuntime.test.ts` default-timeout case after focused tests passed. GPT Pro classified it as P2 test-harness / suite-performance flake, not CO-571 product correctness; the branch split the duplicate/ambiguous git-heavy cases into separate parameterized tests, then the focused subset, containing file, and full `npm run test` all passed.
- 2026-05-20: Manifest-backed `gpt-5.5/xhigh` standalone review completed clean in enforce mode for the second-rework branch; next step is commit, PR, and current-head GitHub review/check monitoring.
- 2026-05-21 UTC: PR #858 Core Lane failed only at strict CI spec guard because the third-rework branch did not carry base-bound fallback/seam docs evidence. Rework adds the CO-480 map-missing current-poll evidence across PRD, TECH_SPEC, ACTION_PLAN, checklist, and agent mirror; local validation must run spec guard with `BASE_SHA=e37f55b434f1bca59daacf38a1b2c2aa9ad9890f`.
- 2026-05-21: After PR #858 merged, latest main `ae1847156fbae3a3bdd3fe7177a41045c3fd8447` still hit `claim_issue_by_id:released` for CO-529 Backlog/backlog released `not_active`. This worker branch adds the focused passive Backlog guard and regression; parent owns PR, Linear transition, and live proof.
- 2026-05-21: After PR #859 merged, latest main `e27ade20732c2a9ad859a30242309473cc263db0` still hit `claim_issue_by_id:released` for CO-522 retained merged-closeout history even though live Linear truth is Done/completed and PR #795 is merged. This rework adds focused stale merged-closeout passive/current-promotion/reopened/live-Done cleanup regressions.
- 2026-05-21: Fifth-rework implementation validation passed through focused tests, full `ProviderIssueHandoff.test.ts`, spec guard, build, lint, full `npm run test`, `docs:check`, repo stewardship, diff budget, pack smoke, and enforced `gpt-5.5/xhigh` review. `docs:freshness` remains blocked by unrelated CO-558 rolling cohort debt and is recorded as a baseline blocker, not a CO-571 regression.
