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
- [x] `npm run docs:freshness`.
- [x] `npm run repo:stewardship`.
- [x] `git diff --check`.
- [x] `node scripts/diff-budget.mjs`.
- [x] `npm run pack:smoke`.
- [x] Standalone review and elegance pass, or exact blocker recorded. Evidence: enforced `gpt-5.5/xhigh` review at `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T18-03-32-648Z-cec26c42/review/output.log` returned `overall_verdict=clean`; post-review minimality pass kept the scoped predicate/test shape unchanged.
- [x] Second-rework standalone review. Evidence: enforced `gpt-5.5/xhigh` review at `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T23-08-01-403Z-bf3480a0/review/output.log` returned `overall_verdict=clean` and `review contract: mode=enforce, validation=valid, overall=clean`.
- [x] Draft PR opened and linked to CO-571. Evidence: PR #855, `https://github.com/Kbediako/CO/pull/855`.

## CO-382 Fallback Decision Table
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove fallback where terminal released historical claim reconciliation is treated as active stuck refresh health.
- Retention decision: provider-intake released historical claims remain audit evidence and are not deleted.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider refresh lifecycle classification | Terminal released historical claims can escalate to active stuck refresh health. | remove fallback | CO-571 | Released terminal claim with no active run/retry/worker corroboration, including no-current-poll-snapshot direct issue-by-id fallback, current-poll terminal `not_active` snapshots, and map-missing terminal `not_active` rows filtered out of the current poll map. | Observed 2026-05-20 | 2026-05-20 | This issue | Terminal released claims stop driving `restart_required`. | Focused released-claim, no-snapshot, current-poll terminal, map-missing terminal, stale-promotion, and active-stall regressions. |
| Passive Backlog released not_active classification | Parked Backlog released claims can escalate to direct issue-by-id stuck refresh health. | remove fallback | CO-571 | CO-529-style released `provider_issue_released:not_active` Backlog/backlog row with no active run, retry, promotion, merge-closeout, or cancelable retained-run evidence. | Observed 2026-05-21 | 2026-05-21 | This issue | Passive Backlog/not_active rows skip direct issue-by-id while active/reopened/pending-review/retry/Blocked/merge-closeout paths still revalidate. | Focused CO-529 Backlog regression plus existing active/reopened/current-promotion/active-stall regressions. |
| Provider-intake history | Released historical claims stay retained for traceability. | justify retaining fallback | Provider-intake audit contract / CO-571 | Terminal issue release records historical claim state. | Existing behavior before CO-571 | 2026-05-20 | Non-expiring durable retention only with rationale | Separate approved audit-history redesign replaces retained claim history with equivalent source-labeled evidence. | Tests keep claims inactive without deleting evidence. |

- Contract name: provider-intake released historical claim audit retention.
- Owning surface: provider-intake state and control-host status/read models.
- Steady-state proof: raw released claim rows remain source-labeled audit evidence, while terminal released `not_active` claims and passive Backlog released `not_active` claims with complete cached metadata, null retry fields, and no active or cancelable retained run do not drive `restart_required` or retrying WIP.
- Tests/docs: `ProviderIssueHandoff.test.ts` terminal released metadata-only table, no-current-poll-snapshot regression, current-poll terminal snapshot regression, map-missing terminal snapshot regression, CO-529 Backlog regression, accepted pending-revalidation no-current-poll regression, stale/current `review_promotion` regressions, active-stuck regression, `ControlRuntime.test.ts` retry projection regression, and this CO-571 packet.
- Non-expiring rationale: retained released claim history is durable operator/audit evidence, not temporary compatibility debt; removal requires an approved archival redesign that preserves equivalent source-labeled claim/run evidence.

## Progress Log
- 2026-05-20: Live issue-context read, initial workpad created, serial same-turn parallelization decision recorded, and docs-first packet started. Parent later supplied CO-469 Duplicate/canceled evidence and CO-471 Done retry-projection mismatch evidence; packet included both as terminal released historical claim scope.
- 2026-05-20: Implementation committed and draft PR #855 opened after focused validation, pack smoke, and enforced `gpt-5.5/xhigh` review returned clean.
- 2026-05-20: PR #855 merged, but live current-main evidence still looped on no-current-poll-snapshot `claim_issue_by_id:released`. CO-571 reopened to Rework and PR #856 updates the classifier before direct issue-by-id, with stale/current `review_promotion` regression coverage.
- 2026-05-20: PR #856 merged, but live current-main evidence still looped on current-poll `claim_reconcile:released` for terminal `not_active` history such as CO-482/CO-478. CO-571 reopened to Rework again; this branch updates the current-poll classifier before per-claim reconcile progress and adds passive/reopened regressions.
- 2026-05-20: Full-suite validation twice hit the same unrelated `ControlRuntime.test.ts` default-timeout case after focused tests passed. GPT Pro classified it as P2 test-harness / suite-performance flake, not CO-571 product correctness; the branch split the duplicate/ambiguous git-heavy cases into separate parameterized tests, then the focused subset, containing file, and full `npm run test` all passed.
- 2026-05-20: Manifest-backed `gpt-5.5/xhigh` standalone review completed clean in enforce mode for the second-rework branch; next step is commit, PR, and current-head GitHub review/check monitoring.
- 2026-05-21 UTC: PR #858 Core Lane failed only at strict CI spec guard because the third-rework branch did not carry base-bound fallback/seam docs evidence. Rework adds the CO-480 map-missing current-poll evidence across PRD, TECH_SPEC, ACTION_PLAN, checklist, and agent mirror; local validation must run spec guard with `BASE_SHA=e37f55b434f1bca59daacf38a1b2c2aa9ad9890f`.
- 2026-05-21: After PR #858 merged, latest main `ae1847156fbae3a3bdd3fe7177a41045c3fd8447` still hit `claim_issue_by_id:released` for CO-529 Backlog/backlog released `not_active`. This worker branch adds the focused passive Backlog guard and regression; parent owns PR, Linear transition, and live proof.
