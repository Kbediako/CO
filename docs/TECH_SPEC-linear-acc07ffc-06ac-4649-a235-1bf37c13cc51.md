---
id: 20260411-linear-acc07ffc-06ac-4649-a235-1bf37c13cc51
title: CO: prevent archived or trashed Linear issues from being claimed or mutated as active provider lanes
relates_to: docs/PRD-linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md
risk: high
owners:
  - Codex
last_review: 2026-04-11
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md`
- PRD: `docs/PRD-linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md`
- Task checklist: `tasks/tasks-linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md`

## Traceability
- Linear issue: `CO-153` / `acc07ffc-06ac-4649-a235-1bf37c13cc51`
- Linear URL: https://linear.app/asabeko/issue/CO-153/co-prevent-archived-or-trashed-linear-issues-from-being-claimed-or

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: prevent archived or trashed Linear issues from being admitted or continued as active provider lanes while preserving live-restored recovery and truthful deterministic retry suppression.
- Scope:
  - tracked issue discovery/query truth in `linearDispatchSource.ts`
  - provider intake claim/admission truth in `providerIssueHandoff.ts` and `providerIntakeState.ts`
  - issue-context/summary/cache and mutation fail-closed behavior in `providerLinearWorkflowFacade.ts`
  - deterministic retry suppression in `providerLinearWorkerTruth.ts`, worker prompts, and selected-run/proof summaries
  - focused tests plus required validation gates
- Constraints:
  - no auto-unarchive automation
  - no broad provider-worker refactor beyond admission/mutability truth
  - preserve idempotent `noop` behavior when state or workpad already matches

## Technical Requirements
- Functional requirements:
  - tracked issue reads must expose `archived_at` and `trashed` truth.
  - archived/trashed issues must not be eligible for fresh dispatch or provider claim/start.
  - provider intake claims must persist enough mutability truth to make retry/rehydration decisions truthful when operating from persisted snapshots.
  - `issue-context`, cached summaries, and direct mutation helpers must expose `archived_at` and `trashed`.
  - `transition` and `upsert-workpad` must return `linear_issue_not_mutable` before real writes on archived/trashed issues.
  - cached archived summaries/contexts must revalidate live before blocking a restored issue.
  - deterministic suppression derivation must treat `linear_issue_not_mutable` as same-attempt no-retry truth for worker prompts and selected-run/proof summaries.
- Non-functional requirements:
  - fail closed when mutability truth is explicit
  - keep the fix additive and backward-compatible for older persisted records by normalizing missing mutability fields to mutable defaults
  - preserve current `noop` and review-handoff behavior for already-correct targets
- Interfaces / contracts:
  - `LiveLinearTrackedIssue` gains mutability fields.
  - `ProviderIntakeClaimRecord` gains persisted mutability fields.
  - `ProviderLinearIssueContext` / summary / cached context gain mutability fields.
  - `linear_issue_not_mutable` becomes a deterministic provider mutation suppression reason.

## Architecture & Data
- Architecture / design adjustments:
  - extend Linear tracked-issue GraphQL queries to request `archivedAt` and `trashed` and normalize them into `LiveLinearTrackedIssue`.
  - add an explicit mutability helper and use it in fresh-dispatch eligibility plus handoff eligibility.
  - persist issue mutability fields in intake claims so snapshot-based retry or rehydration logic stays truthful.
  - extend issue-context/summary query parsing, cached-context normalization, and direct mutation paths with a single `failureIfIssueNotMutable(...)` helper plus live revalidation for stale archived cache paths.
  - keep provider lifecycle semantics simple: archived/trashed issues become non-executable/inactive until a live reread proves they are restored.
- Data model changes / migrations:
  - add `archived_at` / `trashed` to tracked issues, issue-context cache, and provider intake claims.
  - no migration required; missing historical values normalize to `null` / `false`.
- External dependencies / integrations:
  - Linear GraphQL issue and issues queries
  - provider intake persistence under `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - selected-run/proof summary readers

## Validation Plan
- Tests / checks:
  - audited docs-review child stream before implementation
  - focused `orchestrator/tests/LinearDispatchSource.test.ts`
  - focused `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - focused `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
  - focused `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - focused `orchestrator/tests/SelectedRunProjection.test.ts`
  - required repo validation floor before handoff
- Rollout verification:
  - workpad and proof must show archived issues blocked before active-lane mutation and restored issues succeeding after reread
- Monitoring / alerts:
  - provider claim reasons should make not-mutable blocks explicit instead of looking like generic inactive-state drift

## Open Questions
- Whether a separate follow-up is warranted to project explicit archived/trashed claim truth into more operator-facing compatibility dashboards once the bounded admission/mutation fix lands.

## Approvals
- Reviewer: pending audited docs-review
- Date: 2026-04-11
