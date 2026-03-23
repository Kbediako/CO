# TECH_SPEC - Coordinator Symphony Post-Merge Retry-Timer Follow-Up

## Added by Bootstrap 2026-03-23

## Summary
- Objective: stabilize the post-merge `Core Lane` retry-timer test failure on `main` without reopening the already-landed Symphony runtime parity work.
- Scope: docs-first lane registration, exact GitHub failure capture, truthful classification of the failure surface, optional follow-up Linear issue creation, minimal patching, validation, and delivery closeout.
- Constraints:
  - keep runtime/provider logic unchanged unless a real bug is reproduced
  - preserve `1319` lifecycle semantics and current live Linear workflow-state posture
  - keep the implementation narrow and reviewable

## Technical Requirements
- Functional requirements:
  - register `1320` in all required docs/task mirrors before code changes
  - capture the exact failing Actions evidence for run `23425656167`
  - classify the failure as runtime bug vs test flake using local reproduction attempts and code audit
  - if current Linear auth/bindings allow it, create a follow-up issue in the same workspace/team/project as `CO-2`
  - stabilize the failing retry-timer test using deterministic fake-timer progression and observable side effects instead of brittle callback-order assumptions where possible
  - keep the patch limited to the exact failing test or the smallest adjacent retry-timer cluster justified by evidence
- Non-functional requirements (performance, reliability, security):
  - no provider/control-host downtime
  - no changes to auth/secrets handling
  - validation must include the repo’s required floor
- Interfaces / contracts:
  - `ProviderIssueHandoff` runtime behavior stays the source of truth unless a reproduced logic failure proves otherwise
  - Linear follow-up creation, if used, must stay within the configured `CO_LINEAR_*` workspace/team/project bindings

## Architecture & Data
- Architecture / design adjustments:
  - prefer test-only stabilization in `ProviderIssueHandoff.test.ts`
  - avoid direct callback firing against captured `setTimeout` handlers when the queue contract can be proven by advancing fake timers and asserting persisted outcomes
  - keep any Linear follow-up creation out of the packaged helper CLI; use the underlying GraphQL client only for this operator-owned remediation action if needed
- Data model changes / migrations:
  - none expected for runtime data
  - docs/task registry gains the new `1320` lane
- External dependencies / integrations:
  - GitHub Actions logs for run `23425656167`
  - Linear GraphQL API through current env credentials if follow-up issue creation is performed

## Current Truth
- Post-merge `main` failed on March 23, 2026 in `Core Lane` `Test`.
- The single failing test is `createProviderIssueHandoffService > cancels and replaces queued retry ownership when a newer persisted due_at supersedes an older timer`.
- The merge commit that triggered the run did not change `ProviderIssueHandoff` runtime files.
- The PR head had already passed before merge.
- Local targeted runs of the exact failing case pass, including repeated stress runs.
- The leading hypothesis is CI-only timer brittleness, not a fresh runtime parity gap.
- No new live Linear workflow status is required for this remediation.

## Validation Plan
- Tests / checks:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 1320-coordinator-symphony-post-merge-retry-timer-follow-up`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` only if downstream-facing CLI/package surfaces change
  - focused repeated runs of the stabilized `ProviderIssueHandoff` case or file
- Rollout verification:
  - required checks on the follow-up PR reach terminal green
  - quiet-window merge discipline holds before merge
- Monitoring / alerts:
  - none beyond CI status for this narrow follow-up

## Open Questions
- Whether to patch only the exact failing case or also the two adjacent callback-driven retry tests in the same cluster if they share the same brittleness pattern.

## Approvals
- Reviewer: pending docs-review for `1320`.
- Date: 2026-03-23
