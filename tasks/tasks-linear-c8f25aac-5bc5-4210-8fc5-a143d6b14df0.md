# Task Checklist - linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0

- Linear Issue: `CO-544` / `c8f25aac-5bc5-4210-8fc5-a143d6b14df0`
- Task registry id: `20260516-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0`
- MCP Task ID: `linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0`
- Primary PRD: `docs/PRD-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- TECH_SPEC: `tasks/specs/linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- Linear workpad: `55944d9b-f5ef-44d6-9ce2-5224ee563e05`

## Docs-First
- [x] Live issue-context read before implementation. Evidence: `codex-orchestrator linear issue-context --issue-id CO-544 --format json` reported `In Progress`, UUID `c8f25aac-5bc5-4210-8fc5-a143d6b14df0`, no attached PR.
- [x] Workpad created with decomposition matrix. Evidence: Linear workpad `55944d9b-f5ef-44d6-9ce2-5224ee563e05`.
- [x] Exactly one `linear parallelization` decision recorded. Evidence: `stay_serial` / `single_bounded_change` on 2026-05-16.
- [x] PRD created with live CO-544 issue contract, protected terms, non-goals, Not Done If, and fallback/refactor decisions. Evidence: `docs/PRD-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`.
- [x] TECH_SPEC created with root-cause design boundaries and validation plan. Evidence: `tasks/specs/linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`, `docs/TECH_SPEC-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`.
- [x] ACTION_PLAN created for implementation, validation, review, and handoff sequencing. Evidence: `docs/ACTION_PLAN-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`.
- [x] Task registration updated in canonical `tasks/index.json` `items[]` shape. Evidence: `tasks/index.json`.
- [x] Pre-implementation docs-review or recorded fallback. Evidence: `.runs/linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0/cli/2026-05-16T06-53-01-659Z-cca3905f/manifest.json` passed delegation override, spec-guard dry-run, and `docs:check`, then failed on existing CO-522 docs-freshness capacity debt with `freshness_decision=block_diff_local`, `blocking_changed_paths=[]`, `owner_issue=CO-522`, `owner_usable=true`; accepted as unrelated pre-implementation fallback for CO-544.

## Acceptance Criteria
- [x] Rehydrated accepted claims with live non-runnable Linear states (`Blocked`, handoff, terminal, or otherwise not execution-eligible) are released/downgraded and do not occupy active WIP. Evidence: `resolveTrackedIssuePollResolutionWithFallback` now lets cached pending revalidation probe direct issue-by-id before staying fail-closed, and `ProviderIssueHandoff.test.ts` covers live `Blocked` release to `provider_issue_released:not_active`.
- [x] Live evidence unavailable remains fail-closed; stale cache is not silently assumed clean. Evidence: `ProviderIssueHandoff.test.ts` covers direct issue evidence returning `skip` while the cached pending-revalidation accepted claim remains accepted and unlaunched.
- [x] Deferred pending-revalidation reads are release-only. Evidence: after CI rework, deferred polls may use direct issue-by-id to release live non-runnable claims, but live runnable results stay cached pending and do not launch until a non-deferred poll.
- [x] `co-status` and `control-host freshness-gauge` distinguish cached pending revalidation from live active worker claims. Evidence: focused `ControlRuntime.test.ts` status case passed; new `ProviderControlHostFreshnessGauge.test.ts` pending-revalidation no-run case passed.
- [x] Regression coverage includes CO-510/CO-512-style stale cached `In Progress` claims with live `Blocked` Linear state. Evidence: new CO-510-shaped `Blocked` direct issue regression and CO-512-shaped unavailable-evidence regression.
- [x] No manual `provider-intake-state.json` edits; supported provider-intake/control-host logic is fixed. Evidence: implementation changed `orchestrator/src/cli/control/providerIssueHandoff.ts`; no state file edits.

## Protected Issue Terms
- [x] `provider_issue_rehydration_pending_revalidation`
- [x] `provider-intake-state.json`
- [x] `CO-510`
- [x] `CO-512`
- [x] `Blocked`
- [x] stale `issue_state=In Progress`
- [x] `co-status`
- [x] `control-host freshness-gauge`
- [x] active WIP

## Fallback Decision Table
- Large-refactor decision: not required; this lane removes one stale cached active-WIP failure without splitting provider-intake authority.
- Minor-seam decision: acceptable because live Linear remains final state authority and cached pending revalidation remains fail-closed only when live evidence is unavailable.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rehydrated accepted pending revalidation | Cached accepted row with stale runnable metadata can occupy active WIP before live revalidation releases it. | `remove fallback` | CO-544 | Live Linear state is non-runnable for a rehydrated accepted pending-revalidation claim. | 2026-05-16 | 2026-05-16 | This issue | Live non-runnable state releases/downgrades the claim and excludes it from active WIP. | Focused CO-510/CO-512-shaped regression. |
| Missing live issue evidence | Revalidation cache state stays fail-closed instead of assuming stale cache is clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue evidence is unavailable, incomplete, or degraded. | Existing provider-intake rehydration behavior | 2026-05-16 | Durable safety contract | Separate issue-quality review proves fail-closed pending revalidation is no longer needed. | Regression coverage for unavailable evidence preserving pending/degraded classification. |

- Contract name: provider-intake revalidation fail-closed cache state.
- Owning surface: provider-intake control-host claim refresh.
- Steady-state proof: absent live issue evidence remains visible as degraded cache truth and never becomes clean active-worker truth.
- Tests/docs: focused `ProviderIssueHandoff` and freshness-gauge regressions plus this CO-544 packet.
- Non-expiring rationale: this is a durable source-truth-loss safety contract, not temporary compatibility debt; remove only after a reviewed replacement proves equivalent fail-closed behavior.

## Implementation
- [x] Inspect provider-intake refresh and active-WIP classification. Evidence: root cause isolated to `resolveTrackedIssuePollResolutionWithFallback` returning `provider_issue_poll_cached_revalidation_pending` before direct issue-by-id revalidation during deferred poll refresh.
- [x] Add focused failing regression for stale accepted pending-revalidation cached `In Progress` with live `Blocked`. Evidence: `npm run test:core -- orchestrator/tests/ProviderIssueHandoff.test.ts -t "pending-revalidation accepted claims"` failed before the fix because `resolveTrackedIssue.mock.calls` was `[]`.
- [x] Implement generic fix without CO-510/CO-512 special casing. Evidence: only the cached `provider_issue_poll_cached_revalidation_pending` branch now revalidates through direct issue-by-id when allowed; skip/unavailable still returns the cached fail-closed reason.
- [x] Add status/freshness-gauge classification coverage. Evidence: added freshness-gauge pending-revalidation no-run test and ran existing co-status/control-runtime pending-revalidation distinction test.

## Validation
- [x] Focused provider-intake/control-host regression. Evidence: `npm run test:core -- orchestrator/tests/ProviderIssueHandoff.test.ts -t "pending-revalidation"` passed, 7 tests.
- [x] Focused fail-closed unavailable live evidence regression. Evidence: included in the same `ProviderIssueHandoff.test.ts -t "pending-revalidation"` run.
- [x] Status/freshness-gauge classification assertions. Evidence: `npm run test:core -- orchestrator/tests/ProviderControlHostFreshnessGauge.test.ts -t "cached pending-revalidation claims"` passed, 1 test; `npm run test:core -- orchestrator/tests/ControlRuntime.test.ts -t "keeps accepted no-run pending-revalidation claims active but not running"` passed, 1 test.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: command exited 0 in dry-run mode while reporting unrelated baseline stale specs from 2026-04-14/2026-04-15.
- [x] Focused `npm run test:core -- <touched tests>`. Evidence: focused tests above; no broad test suite run per parent request for focused validation only.
- [x] Build/lint/docs gates as required by touched surface. Evidence: parent orchestration ran `npm run build` successfully after worker handoff; pre-implementation docs-review recorded unrelated CO-522 docs-freshness capacity debt; final closeout guard status is recorded below.
- [x] Explicit elegance/minimality review. Evidence: post-diff manual minimality pass kept the fix to one branch in `resolveTrackedIssuePollResolutionWithFallback`, restored an accidental existing-test option change, and retained only focused regression coverage.
- [x] Model-backed standalone review. Evidence: `codex-orchestrator review --uncommitted --runtime-mode appserver` with `gpt-5.5` / `xhigh` completed clean with semantic review verdict `clean`; output saved to `.runs/linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0/cli/2026-05-16T06-53-01-659Z-cca3905f/review/output.log`.
- [x] Final closeout guards. Evidence: `git diff --check` passed; `node scripts/diff-budget.mjs` passed (`files=10/25`, `lines=727/1200` before CI rework; current working-tree rework diff `files=3/25`, `lines=26/1200`, stacked branch `lines=753/1200`); `npm run lint` exited 0 with three existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`; `npm run docs:check` passed; `npm run repo:stewardship` passed; `node scripts/spec-guard.mjs --dry-run` exited 0 while reporting unrelated stale-spec baseline debt; `npm run docs:freshness` failed on repo-wide stale-doc baseline debt (`323` stale docs, `CO-522` owner already recorded in pre-implementation docs-review).
- [x] Delegation guard handled. Evidence: strict `node scripts/delegation-guard.mjs --task linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0` found no repo-local subagent manifests because the implementation worker was a desktop `spawn_agent`; rerun with `DELEGATION_GUARD_OVERRIDE_REASON='desktop spawn_agent worker_complex 019e2f89-e720-7e40-a32d-087c9c15976f completed CO-544 implementation in isolated worktree; repo-local manifest unavailable for desktop collab subagent'` passed.

## Progress Log
- 2026-05-16: Live issue-context read confirmed CO-544 is `In Progress`, no attached PR.
- 2026-05-16: Workpad created and exactly one `linear parallelization` decision recorded as `stay_serial` / `single_bounded_change`.
- 2026-05-16: Docs-first packet created before source/test implementation.
- 2026-05-16: Pre-implementation docs-review wrapper rerun used scoped delegation override and stopped on existing CO-522 docs-freshness capacity debt, not CO-544 changed paths.
- 2026-05-16: Implemented focused provider-intake fallback fix and regression coverage; focused validation passed, with broad gates intentionally deferred to the parent-requested focused-validation scope.
- 2026-05-16: Parent orchestration reran focused tests, `git diff --check`, `npm run build`, and gpt-5.5/xhigh standalone review; review returned clean.
- 2026-05-16: Final closeout guard sweep recorded lint/docs/check/stewardship success, diff-budget success, delegation override, and the existing repo-wide docs-freshness failure.
- 2026-05-16: CI rework after PR #818 Core Lane failed two tests: deferred pending-revalidation direct reads now release only and do not launch runnable work during `deferFreshDiscovery`, and the selected docs-gate test now uses a fresh generated timestamp so the fixed-date fixture does not expire. Validation rerun passed the two failing slices, all touched test files (`570` tests), build, lint, docs:check, diff-check, and diff-budget.

## Notes
- Parent orchestration remains responsible for live queue/control-host monitoring and any Linear changes outside CO-544.
