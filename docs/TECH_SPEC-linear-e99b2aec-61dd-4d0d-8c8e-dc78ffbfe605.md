---
id: 20260411-linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605
title: CO: Back off GitHub GraphQL and REST polling in PR readiness and merge closeout
relates_to: docs/PRD-linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md
risk: high
owners:
  - Codex
last_review: 2026-04-11
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md`
- PRD: `docs/PRD-linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md`
- Task checklist: `tasks/tasks-linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md`

## Traceability
- Linear issue: `CO-151` / `e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605`
- Linear URL: https://linear.app/asabeko/issue/CO-151/co-back-off-github-graphql-and-rest-polling-in-pr-readiness-and-merge

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: classify and back off GitHub REST/GraphQL throttles in PR readiness and merge closeout while preserving existing safety gates.
- Scope:
  - GitHub rate-limit classification in `scripts/lib/pr-watch-merge.js`
  - reset-aware watcher/provider cooldown planning
  - same-head quiet-window cache reuse for expensive fan-out evidence
  - additive provider proof metadata for GitHub API budget exhaustion
  - focused regressions plus required validation gates
- Constraints:
  - no review/merge gate weakening
  - no Linear API budget work
  - no CodeRabbit service cooldown reclassification

## Technical Requirements
- Functional requirements:
  - REST 403/429 and GraphQL throttle cases must produce explicit GitHub rate-limit status.
  - reset/retry metadata must survive through watcher status and provider records.
  - `pr ready-review`, `pr resolve-merge`, and provider merge closeout must wait through GitHub reset windows with bounded jitter/backoff.
  - same-head cached snapshots must reduce avoidable fan-out without weakening readiness gates.
  - provider proof must distinguish GitHub API exhaustion from Linear API cooldown and CodeRabbit service cooldown.
- Non-functional requirements:
  - fail closed on ambiguous cache validity
  - keep sleeps bounded by the existing monitor timeout
  - keep data additions backward-compatible
- Interfaces / contracts:
  - `fetchPrStatusSnapshot(...)` remains the provider-facing snapshot API
  - provider snapshot records gain optional GitHub rate-limit metadata
  - watcher status output gains classified GitHub throttle text

## Architecture & Data
- Architecture / design adjustments:
  - add a classifier and sleep planner in the watcher module
  - add cache state beside the existing required-check cache so same-head quiet-window polls can reuse prior fan-out evidence
  - thread optional GitHub throttle metadata through provider closeout/review-promotion records
- Data model changes / migrations:
  - optional GitHub API rate-limit metadata on snapshot/provider records
  - no migration required; older records omit the new field
- External dependencies / integrations:
  - GitHub CLI REST and GraphQL output
  - existing provider merge-closeout and review-promotion callers

## Validation Plan
- Tests / checks:
  - docs-review child stream
  - focused `tests/pr-watch-merge.spec.ts`
  - focused provider closeout/observability tests when provider records change
  - full repo validation floor before handoff
- Rollout verification:
  - run `pr ready-review` drain on the final PR before moving the issue to `In Review`
- Monitoring / alerts:
  - provider proof and workpad should record GitHub API throttle status separately from Linear cooldown

## Open Questions
- Whether to retain only latest throttle metadata or a bounded event history in provider records.

## Approvals
- Reviewer: pending audited docs-review
- Date: 2026-04-11
