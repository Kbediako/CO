---
id: 20260405-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7
title: CO: Make Merging-stage merge closeout deterministic and watchdog-backed
relates_to: docs/PRD-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md
risk: high
owners:
  - Codex
last_review: 2026-04-05
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`
- PRD: `docs/PRD-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`
- Task checklist: `tasks/tasks-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`

## Traceability
- Linear issue: `CO-80` / `7bb1895e-cda2-4173-86ec-c6794ccb1ce7`
- Linear URL: https://linear.app/asabeko/issue/CO-80/co-make-merging-stage-merge-closeout-deterministic-and-watchdog-backed

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make `Merging` closeout a deterministic provider/control-host contract with watchdog-backed recovery and machine-checkable evidence.
- Scope:
  - docs-first packet and workpad for `CO-80`
  - structured merge-closeout proof state
  - handoff/relaunch/watchdog logic for merge-ready `Merging` issues
  - reusable PR readiness truth sharing
  - focused regressions and standard validation/review gates
- Constraints:
  - keep the repair bounded to final merge closeout, not the whole Linear lifecycle
  - preserve fail-closed behavior for non-mergeable PRs
  - reuse existing `CO-25` shared-root closeout contract instead of reworking it

## Technical Requirements
- Functional requirements:
  - persist explicit merge-closeout arming, attempt, result, shared-root reconciliation, and final Linear transition data
  - allow the control-host to watchdog and relaunch merge-closeout when a clean merge-ready issue is idle in `Merging`
  - distinguish autonomous success from explicit operator-action-required failure
  - make restart/recovery reclaim merge-ready closeout without another operator state flip
  - reuse the existing GitHub readiness inputs already encoded in `pr-watch-merge`
- Non-functional requirements:
  - monotonic, auditable artifact updates
  - bounded retry/watchdog behavior
  - no silent success inference from generic worker end reasons
- Interfaces / contracts:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
  - `scripts/lib/pr-watch-merge.js`
  - provider proof and control-runtime / observability projections

## Architecture & Data
- Architecture / design adjustments:
  - extend provider proof with merge-closeout metadata
  - teach handoff/relaunch to interpret merge-closeout metadata plus PR readiness
  - extract or share PR readiness snapshot logic so merge-closeout arming is deterministic
  - keep shared-root reconciliation as the final merged closeout step from the existing contract
- Data model changes / migrations:
  - additive proof fields only; no destructive state migration
- External dependencies / integrations:
  - `gh`-backed PR readiness reads
  - Linear issue attachment reads
  - existing control-host refresh watchdog

## Validation Plan
- Tests / checks:
  - `linear child-stream --pipeline docs-review --stream co-80-docs-review`
  - focused provider worker / handoff / PR readiness regressions
  - full repo validation floor
  - manifest-backed standalone review and explicit elegance review
- Rollout verification:
  - merge-closeout artifacts become explicit and operator-readable
  - restart/recovery proves deterministic re-entry for clean merge-ready issues
- Monitoring / alerts:
  - selected-run / control-runtime surfaces should expose the new proof state without custom ad hoc scraping

## Open Questions
- Whether proof-only persistence is sufficient for watchdog correctness. Prefer proof-only unless tests require claim-level caching.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-05
