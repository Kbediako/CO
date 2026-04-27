---
id: 20260327-linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8
title: Terminal Workspace Cleanup Hook and Attached-PR Auto-Close
relates_to: docs/PRD-linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md
risk: high
owners:
  - Codex
last_review: 2026-04-27
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`
- PRD: `docs/PRD-linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`
- Task checklist: `tasks/tasks-linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`

## Traceability
- Linear issue: `CO-5` / `964ca955-cf9b-4d1b-887b-4d3bb49069d8`
- Linear URL: https://linear.app/asabeko/issue/CO-5/co-add-workflow-cleanup-hook-and-attached-pr-auto-close-on-terminal

## Summary
- Objective: Add a metadata-driven terminal cleanup hook for `provider-linear-worker` that can close a matching attached open GitHub PR before provider workspace removal and surface non-fatal cleanup failures.
- Scope:
  - docs-first registration for `CO-5`
  - provider pipeline metadata to enable terminal cleanup behavior
  - control-host cleanup execution before provider worktree deletion
  - attached GitHub PR discovery via Linear issue attachments plus workspace branch matching
  - machine-readable cleanup failure surfacing and focused regressions
- Constraints:
  - stay bounded to terminal workspace removal
  - do not add generic PR automation or non-terminal cleanup behavior
  - record the delegation override explicitly for this worker run

## Technical Requirements
- Functional requirements:
  - parse terminal cleanup metadata from the effective `provider-linear-worker` pipeline config
  - run terminal cleanup before `cleanupProviderWorkspace()` removes the worktree
  - inspect the current workspace branch and the current issue’s attached GitHub PR URLs
  - close only attached GitHub PRs whose head branch matches the workspace branch and whose state is still open
  - use a concise machine-generated close reason aligned with the Symphony baseline
  - keep terminal cleanup failures non-fatal to claim release, refresh, and rehydrate flows
  - surface cleanup failures in a machine-readable control-host payload alongside logs
- Non-functional requirements (performance, reliability, security):
  - keep deletion scoped to provider-managed workspaces only
  - avoid shelling out to broad repo scans; inspect only the current workspace branch and attached PR URLs
  - preserve last-known-good provider workflow metadata when repo config reloads fail
- Interfaces / contracts:
  - config contract: `codex.orchestrator.json` `provider-linear-worker` metadata carries terminal cleanup settings
  - control-host contract: provider issue handoff invokes terminal cleanup before workspace deletion and swallows cleanup-hook failures after logging/surfacing them
  - GitHub contract: `gh pr view` determines branch/state, `gh pr close` closes matching open PRs
  - Linear contract: attached PR URLs come from `getProviderLinearIssueContext()`

## Architecture & Data
- Architecture / design adjustments:
  - extend pipeline config typing to preserve metadata for `provider-linear-worker`
  - let `providerWorkflowConfigStore` parse and expose terminal cleanup config from the last known good pipeline snapshot
  - add a provider-terminal-cleanup helper that reads the workspace branch, issue attachments, and matching PR state before attempting closure
  - invoke that helper from the provider-claim terminal cleanup path in `providerIssueHandoff` before calling `cleanupProviderWorkspace`
  - surface cleanup status/error through the existing control-host provider workflow payload
- Data model changes / migrations:
  - no persistent schema migration expected beyond additive control-host payload fields
- External dependencies / integrations:
  - Linear GraphQL helper surface
  - GitHub CLI
  - provider control-host runtime and observability payloads

## Validation Plan
- Tests / checks:
  - docs-review before implementation
  - focused tests for no attached PR, already-closed PR, successful close, close-hook failure, and terminal cleanup integration
  - required repo validation floor after implementation
- Rollout verification:
  - confirm terminal claim cleanup still removes the worktree
  - confirm a matching attached open PR closes before removal
  - confirm cleanup failure leaves the claim release intact and visible in control-host state
- Monitoring / alerts:
  - control-host logs for cleanup inspection/close failures
  - machine-readable control-host payload for latest cleanup failure status

## Open Questions
- Keep the surfaced cleanup status in the smallest truthful payload already emitted by the control-host runtime; do not add a new top-level surface unless existing payloads prove insufficient.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-27
