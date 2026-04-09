---
id: 20260409-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad
title: CO: automate truthful In Review -> Merging promotion after clean review handoff
relates_to: docs/PRD-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`
- PRD: `docs/PRD-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`
- Task checklist: `tasks/tasks-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`

## Traceability
- Linear issue: `CO-116` / `a770da1f-7a08-499d-a680-7f1cd8eee4ad`
- Linear URL: https://linear.app/asabeko/issue/CO-116/co-automate-truthful-in-review-merging-promotion-after-clean-review
- Related lanes:
  - `CO-115` / `bf0ba9ec-47f0-45ac-be83-490df0f0b45d`
  - `CO-111` / `ff81e5d8-2760-41ec-bdbb-5509ae2faade`
  - `CO-104` / `8ef95d79-db42-411c-886c-99bdeee6492b`
  - `CO-100`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: add an audited, truthful control-plane bridge from provider-owned review handoff into `Merging`.
- Scope:
  - docs-first packet registration for `CO-116`
  - one bounded promotion seam in provider issue handoff / merge orchestration
  - persisted promotion or blocker truth
  - focused control-plane regressions
  - required validation and review gates
- Constraints:
  - preserve deterministic merge-closeout behavior once an issue is already in `Merging`
  - preserve same-repo attached-PR selection safety
  - avoid launchd/root-host coupling and broader workflow redesign

## Technical Requirements
- Functional requirements:
  - provider-owned `Human Review` / `In Review` claims must be able to evaluate a bounded promotion path into `Merging`
  - the promotion path must inspect the attached PR through the existing same-repo selector and PR readiness/blocker classifier
  - successful promotion must persist the selected PR, readiness snapshot, and Linear transition outcome
  - refused promotion must persist concrete blocker truth and leave the issue out of `Merging`
  - once an issue is already `Merging`, current deterministic merge-closeout semantics must stay unchanged
  - focused tests must cover promotion success plus refusal cases such as draft, `BEHIND`, unresolved review threads, and failing required checks
- Non-functional requirements:
  - fail closed when issue context or snapshot reads fail
  - keep the solution minimal: additive promotion record and narrow handoff integration
  - preserve current review-handoff ownership behavior for issues without a promotable attached PR
- Interfaces / contracts:
  - control seam: `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - readiness/blocker seam: `scripts/lib/pr-watch-merge.js`
  - attached-PR selector and snapshot mapper: `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - persisted claim shape: `orchestrator/src/cli/control/providerIntakeState.ts`

## Architecture & Data
- Architecture / design adjustments:
  - add a dedicated review-handoff promotion record rather than overloading `merge_closeout`
  - reuse existing attached-PR disambiguation and PR snapshot mapping logic so review promotion and merge closeout stay truth-aligned
  - let ordinary `Merging` closeout remain the next authority after promotion succeeds
- Data model changes / migrations:
  - extend provider intake claims with a persisted review-promotion record
  - surface that record in provider observability so review-handoff blocker truth is audit-visible
- External dependencies / integrations:
  - GitHub PR snapshot reads already used by `pr-watch-merge`
  - Linear issue-context and transition helpers already used by merge closeout

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused `ProviderIssueHandoff.test.ts` coverage for provider-owned review promotion success and refusal paths
  - focused `ProviderMergeCloseout.test.ts` coverage if attached-PR selection or snapshot mapping helpers are shared
  - `ProviderIssueObservability.test.ts` if review-promotion proof changes projected status
  - required repo validation floor after implementation
  - manifest-backed standalone review followed by explicit elegance review before handoff
- Rollout verification:
  - confirm a provider-owned review handoff can promote without manual Linear intervention when the PR meets the bridge contract
  - confirm blocked PR shapes stay out of `Merging` and persist explicit refusal reasons
- Monitoring / alerts:
  - rely on persisted review-promotion record plus existing provider debug and merge-closeout surfaces

## Open Questions
- Resolved 2026-04-09: the bridge uses the stricter merge-mode readiness classifier, so review-only readiness is insufficient and blockers such as `review=REVIEW_REQUIRED`, `mergeStateStatus=BEHIND`, failing required checks, or unresolved actionable review threads keep the issue out of `Merging`.

## Approvals
- Reviewer: `codex-orchestrator docs-review (clean-success)`
- Date: 2026-04-09
