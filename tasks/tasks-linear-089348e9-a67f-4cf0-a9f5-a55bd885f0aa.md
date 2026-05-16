# Task Checklist - linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa

- Linear Issue: `CO-516` / `089348e9-a67f-4cf0-a9f5-a55bd885f0aa`
- Task registry id: `20260516-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa`
- MCP Task ID: `linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa`
- Primary PRD: `docs/PRD-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md`
- TECH_SPEC: `tasks/specs/linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md`
- Linear workpad: parent-owned / not mutated by this manual replacement worker.

## Docs-First
- [x] Issue contract reviewed before implementation. Evidence: parent-provided CO-516 prompt and local packet on 2026-05-16.
- [x] Decomposition matrix recorded. Evidence: `tasks/specs/linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md`.
- [x] Exactly one `linear parallelization` decision recorded locally. Evidence: `stay_serial` / `single_bounded_change` in the spec; no Linear mutation because this replacement worker is explicitly lifecycle-read-only.
- [x] PRD created with protected terms, non-goals, Not Done If, parity matrix, and fallback/refactor decisions. Evidence: `docs/PRD-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md`.
- [x] TECH_SPEC created with implementation boundaries and validation plan. Evidence: `tasks/specs/linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md`, `docs/TECH_SPEC-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md`.
- [x] ACTION_PLAN created. Evidence: `docs/ACTION_PLAN-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md`.
- [x] Task registration updated in canonical `tasks/index.json` `items[]` shape. Evidence: `tasks/index.json`.
- [x] Pre-implementation docs-review or recorded fallback. Evidence: manual replacement worker recorded issue-quality review in this checklist/spec before source edits; post-implementation spec guard and gpt-5.5/xhigh review artifacts are `.runs/linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa/cli/2026-05-16T15-49-15-315Z-0cff6f2f/review/output.log`.

## Acceptance Criteria
- [x] Terminal merged/Done provider-intake claims no longer retain cached non-terminal closeout metadata as active authority. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts` superseded terminal closeout predicate and `orchestrator/tests/ProviderIssueHandoff.test.ts` terminal retained closeout regressions.
- [x] Retained `completed` claims with merged PR plus terminal Linear truth become non-active hygiene state or source-labeled terminal evidence excluded from active non-release alarms. Evidence: `refreshes completed CO-492 PR 793-style merged closeout residue to live Done during rehydrate without dropping audit history`.
- [x] Retained `released` claims refresh stale `issue_state`, `issue_state_type`, and `issue_updated_at` from terminal truth when available. Evidence: `refreshes terminal retained released merge closeout residue through the release path`.
- [x] `review_promotion` / `merge_closeout` audit history remains inspectable. Evidence: CO-492 and CO-510 regressions assert retained `merge_closeout` status/reason/PR metadata after refresh/rehydrate.
- [x] Regression coverage includes CO-492 / PR #793-style `In Review -> Merging -> Done` closeout. Evidence: focused test name above plus `npm run test:core -- --run orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] No manual provider-intake cleanup, review/merge policy change, `goal_evidence` authority change, manifest serialization work, dispatch pilot config change, Linear mutation, GitHub mutation, or push. Evidence: diff scope limited to docs packet/registry, `providerIssueHandoff.ts`, and `ProviderIssueHandoff.test.ts`; lifecycle remains parent-owned.

## Protected Issue Terms
- [x] `provider-intake-state.json`
- [x] `review_promotion`
- [x] `merge_closeout`
- [x] `provider_issue_merge_closeout_merged`
- [x] `provider_issue_released:not_active`
- [x] `CO-513`
- [x] `CO-510`
- [x] `CO-492/#793`
- [x] `In Review -> Merging -> Done`
- [x] `active non-release alarms`

## Fallback Decision Table
- Large-refactor decision: not required for this bounded terminal-authority repair.
- Minor-seam decision: acceptable because it removes stale terminal metadata authority while preserving durable audit evidence.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Terminal closeout metadata | Cached `Merging` / stale non-terminal issue fields survive after merged PR plus Linear `Done`. | `remove fallback` | CO-516 | Live terminal issue truth is available for a claim with merged closeout evidence. | Existing provider closeout behavior | 2026-05-16 | This issue | Claim state/summary no longer treats cached non-terminal closeout metadata as active authority. | Focused provider-intake closeout regression. |
| Retained closeout audit row | Historical `review_promotion` / `merge_closeout` evidence remains on non-active claims. | `justify retaining fallback` | Provider-intake control-host | Claim has terminal closeout history after PR merge/Done. | Existing provider-intake retention behavior | 2026-05-16 | Durable audit contract | Separate archival policy replaces retained provider-intake audit rows. | Regression asserts audit fields remain present while active counts exclude the claim. |

## Implementation
- [x] Inspect terminal closeout claim reconciliation path. Evidence: `isSupersededTerminalMergeCloseoutClaim`, `buildTrackedIssueMergeCloseoutResetFields`, and `buildProviderCompletedRunRehydrateState`.
- [x] Add focused failing regression. Evidence: CO-510 released residue, CO-492 completed residue, and failed non-`Done` transition tests in `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Implement smallest source fix. Evidence: broadened existing terminal closeout predicate and completed-run rehydrate branch in `orchestrator/src/cli/control/providerIssueHandoff.ts`; no new command path.
- [x] Run focused validation. Evidence: targeted ProviderIssueHandoff test filter and full ProviderIssueHandoff test file passed.

## Validation
- [x] Focused changed tests. Evidence: `npm run test:core -- --run orchestrator/tests/ProviderIssueHandoff.test.ts -t "CO-516|CO-492 PR 793-style|failed non-Done transition|terminal retained released merge closeout residue"` passed 3 tests; full file passed 423 tests.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed on 2026-05-16.
- [x] `npm run build`. Evidence: passed on 2026-05-16.
- [x] `npm run lint`. Evidence: passed with 0 errors and 3 pre-existing `DelegationMcpHealth.test.ts` warnings.
- [x] `node scripts/diff-budget.mjs`. Evidence: passed with `files=9/25, lines=1028/1200, +1021/-7`.
- [x] `npm run test`. Evidence: passed 360 files / 5856 tests on 2026-05-16.
- [x] `npm run docs:check`. Evidence: passed after checklist updates on 2026-05-16.
- [x] `npm run pack:smoke`. Evidence: passed after checklist updates on 2026-05-16.
- [x] gpt-5.5/xhigh review. Evidence: `.runs/linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa/cli/2026-05-16T15-49-15-315Z-0cff6f2f/review/output.log` says no actionable correctness issues; telemetry verdict is `unknown` because the wrapper first blocked a validation-command attempt.
- [ ] Worktree clean check. Evidence: pending `git status --short`.

## Progress Log
- 2026-05-16: Worktree created at `.workspaces/linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa` on branch `linear/co-516-terminal-merge-closeout-truth` from `origin/main` `4fe0fea`.
- 2026-05-16: Docs-first packet created before source/test implementation; Linear/GitHub lifecycle intentionally not mutated.
- 2026-05-16: Hardened terminal merged closeout truth to require a deferred merge closeout reason or a failed Linear transition targeting `Done`; added a negative non-`Done` transition regression.
- 2026-05-16: `npm run docs:freshness` still fails on known repo-wide CO-522 baseline debt, with no missing registry for CO-516 changed paths; `docs:freshness:maintain` reports `owner issue: CO-522` and `blocking changed paths: 0`.

## Notes
- Parent orchestration remains responsible for Linear/GitHub lifecycle, PR handoff, and any control-host live restart/proof.
- Delegation guard likely needs an override because this is a manual desktop replacement worker without a repo-local provider-linear-worker manifest.
