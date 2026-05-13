---
id: 20260405-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7
title: CO: Make Merging-stage merge closeout deterministic and watchdog-backed
status: done
relates_to: docs/PRD-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md
related_prd: docs/PRD-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md
related_action_plan: docs/ACTION_PLAN-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md
risk: high
owners:
  - Codex
last_review: 2026-05-06
review_notes:
  - 2026-05-06: CO-503 live Linear audit confirmed CO-80 is `Done` (state_type=completed, updated_at=2026-04-11T00:21:29.848Z) with merged PR #364 attached; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-04-05` so historical implementation evidence remains preserved without staying in active-spec freshness.
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make `Merging` closeout a first-class autonomous provider/control-host contract with deterministic arming, watchdog-backed recovery, and machine-checkable merge closeout evidence.
- Scope:
  - docs-first packet for `CO-80`
  - one active Linear workpad and audited docs-review child stream
  - merge-closeout contract work across provider worker proof, handoff/relaunch logic, and reusable PR readiness truth
  - focused regression coverage for restart/recovery and clean merge-ready idle scenarios
  - standard validation, standalone review, elegance review, and review handoff
- Constraints:
  - stay bounded to final `Merging -> merge -> Done` closeout
  - preserve fail-closed behavior for non-mergeable PRs
  - treat `CO-25` and `CO-51` as predecessor slices rather than reopening their entire scope

## Issue-Shaping Contract
- User-request translation carried forward:
  - this lane must move merge-closeout from prompt guidance into an explicit provider/control-host contract so healthy restart recovery can finish merge-ready issues without another operator nudge
- Protected terms / exact artifact and surface names:
  - `Merging`
  - `Done`
  - `provider-linear-worker-proof.json`
  - `providerIssueHandoff.ts`
  - `providerLinearWorkerRunner.ts`
  - `scripts/lib/pr-watch-merge.js`
  - `codex-orchestrator pr resolve-merge`
  - `git -C "/Users/kbediako/Code/CO" status --short --branch`
  - `git -C "/Users/kbediako/Code/CO" fetch origin refs/heads/main:refs/remotes/origin/main`
  - `git -C "/Users/kbediako/Code/CO" merge --ff-only origin/main`
  - `CO-77`
  - `CO-78`
  - `CO-51`
  - `CO-25`
- Nearby wrong interpretations to reject:
  - `Merging` ownership alone proves autonomy
  - the repo-local skills are sufficient as the final contract
  - a clean PR can remain in `Merging` indefinitely as long as checks are green
  - manual reruns of merge commands are acceptable normal closeout behavior
- Explicit non-goals carried forward:
  - reworking the entire Linear lifecycle or review-state model
  - changing merge policy for intentionally blocked PRs
  - unrelated GitHub workflow redesign

## Parity / Alignment Matrix
- Current truth:
  - provider proof captures generic worker lifecycle but not explicit merge-closeout arming, attempt, result, or shared-root/Linear closeout fields
  - `providerIssueHandoff.ts` can retry active `Merging` work generically, but does not interpret merge-ready PR truth or bounded merge-closeout watchdog state
  - `scripts/lib/pr-watch-merge.js` already computes the exact GitHub readiness signals this lane needs, but only inside worker-invoked PR shepherd commands
  - `providerTerminalCleanup.ts` only handles terminal non-merge cleanup after an issue is inactive
- Reference truth:
  - `Merging` should be a first-class autonomous closeout contract with bounded success or explicit action-required failure
  - restart/recovery should reclaim and continue merge-ready closeout without another operator state flip
  - merge closeout should be auditable from runtime artifacts without inferring intent from generic end reasons
- Target truth / intended delta:
  - merge-closeout state is recorded explicitly on provider artifacts
  - control-host/handoff logic can watchdog and relaunch merge-closeout intentionally from authoritative readiness truth
  - final merge/shared-root/Linear closeout outcomes are machine-checkable
- Explicitly out-of-scope differences:
  - broader review workflow redesign
  - unrelated CI or GitHub policy changes

## Readiness Gate
- Not done if:
  - a clean merge-ready PR can still leave a live issue idle in `Merging`
  - restart recovery can reclaim the issue but not deterministically finish merge closeout
  - merge-closeout evidence still depends on prompt text or ad hoc log reading
- Pre-implementation issue-quality review evidence:
  - reviewed the current tree against the issue and predecessor packets before implementation. `CO-25` only tightened shared-root post-merge closeout and `CO-51` only repaired interrupted merge-drain recovery; neither introduced an explicit provider/control-host merge-closeout contract, so the remaining scope in `CO-80` is real and not just duplicate wording.
- Safeguard ownership split:
  - this parent lane owns the docs packet, workpad, implementation, validation, and review/handoff
  - child `docs-review` is bounded to audited pre-implementation approval evidence for this same issue workspace

## Technical Requirements
- Functional requirements:
  - define explicit merge-closeout arming rules for live `Merging` issues with attached PRs
  - persist machine-checkable merge-closeout evidence covering:
    - arming decision
    - merge attempt state
    - merge result or explicit action-required result
    - shared-root reconciliation result or skip reason
    - final Linear transition result
  - add a deterministic watchdog or equivalent relaunch path when a `Merging` issue is merge-ready but no effective closeout progress exists
  - make restart/recovery able to reclaim and continue merge-ready closeout without another manual state change
  - reuse or extract existing GitHub readiness truth instead of duplicating ad hoc mergeability logic
- Non-functional requirements (performance, reliability, security):
  - preserve fail-closed behavior for non-mergeable or unstable PR states
  - keep merge-closeout artifact writes monotonic and auditable
  - avoid weakening delegation or workflow guardrails
- Interfaces / contracts:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
  - `scripts/lib/pr-watch-merge.js`
  - provider-worker proof and selected-run/control-runtime projections

## Architecture & Data
- Architecture / design adjustments:
  - extend provider-worker proof with a structured merge-closeout section rather than relying only on generic `end_reason`
  - teach handoff/relaunch logic to interpret merge-closeout state and schedule bounded recovery for merge-ready `Merging` issues
  - extract or reuse the existing PR readiness snapshot logic so the control-host can make deterministic arming/watchdog decisions
  - preserve the existing shared-root reconciliation contract from `CO-25` as the final merged closeout step instead of re-implementing it
- Data model changes / migrations:
  - additive provider proof fields for merge-closeout
  - possibly additive helper result shape for PR readiness snapshots
  - no workflow-state migration beyond better interpretation of live `Merging`
- External dependencies / integrations:
  - GitHub CLI readiness reads already used by `pr-watch-merge`
  - Linear issue attachment reads
  - existing control-host refresh/watchdog lifecycle

## Validation Plan
- [x] Audited `linear child-stream --pipeline docs-review --stream co-80-docs-review`. Evidence: `.runs/linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7-co-80-docs-review/cli/2026-04-04T15-45-52-765Z-8416294b/manifest.json`.
- [x] Focused regressions cover merge-closeout proof structure, restart/recovery of merge-ready `Merging` issues, and explicit action-required outcomes when merge readiness is not sustained. Evidence: `orchestrator/tests/ProviderMergeCloseout.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlServerStartupInputPreparation.test.ts`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: local run on 2026-04-05 reported `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: local run on 2026-04-05 after the review-driven fixes.
- [x] `npm run build`. Evidence: local run on 2026-04-05 after the review-driven fixes.
- [x] `npm run lint`. Evidence: local run on 2026-04-05 after the review-driven fixes.
- [x] `npm run test`. Evidence: local run on 2026-04-05 reported `312` files and `2972` tests passed.
- [x] `npm run docs:check`. Evidence: local run on 2026-04-05 after the stale-review-date refresh.
- [x] `npm run docs:freshness`. Evidence: local run on 2026-04-05 after the stale-review-date refresh.
- [x] `node scripts/diff-budget.mjs`. Evidence: local run on 2026-04-05 after the review-driven fixes.
- [x] `FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `.runs/linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7/cli/2026-04-05T01-13-22-125Z-24a60b65/manifest.json`; the latest 2026-04-05 rerun ended with `review_outcome: failed-boundary` / `termination_boundary: command-intent`, so final handoff uses the manual diff review fallback plus explicit elegance pass recorded in Linear workpad comment `2283d72b-14d9-4964-b4b1-d4feabc775bc`.
- [ ] Unresolved actionable review threads: `0` (or waiver recorded with evidence). Evidence before review handoff: GitHub PR `#364` review-thread query plus explicit reply/resolve records for each actionable thread.
- [x] `npm run pack:smoke`. Evidence: local run on 2026-04-05 reported `pack smoke passed`.
- [x] Merge-closeout artifacts show arming, attempt, result, shared-root reconciliation, and final Linear transition fields. Evidence: `orchestrator/src/cli/control/providerMergeCloseout.ts`, `orchestrator/tests/ProviderMergeCloseout.test.ts`.
- [x] Control-host restart/recovery can relaunch a clean merge-ready `Merging` issue without another operator flip. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Non-mergeable cases fail explicitly with action-required evidence instead of silent idle `Merging`. Evidence: `orchestrator/src/cli/control/providerMergeCloseout.ts`, `orchestrator/tests/ProviderMergeCloseout.test.ts`.
- [x] Monitoring relies on provider proof plus existing control-runtime/observability surfaces. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/providerMergeCloseout.ts`.
- [x] Monitoring relies on the new bounded merge-closeout watchdog signal rather than operator polling alone. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.

## Open Questions
- Resolved on 2026-04-05: keep merge-closeout truth on both the proof sidecar and the compact intake-claim `merge_closeout` snapshot. The claim-level record is required for control-host refresh correctness, while the proof remains the detailed worker artifact.

## Approvals
- Reviewer: docs-review child stream (`.runs/linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7-co-80-docs-review/cli/2026-04-04T15-45-52-765Z-8416294b/manifest.json`)
- Date: 2026-04-04
