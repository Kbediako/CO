---
id: 20260325-linear-e147ec4f-0860-4b18-91f6-22f16eaad06d
title: CO Add Symphony-Style Follow-Up Issue Automation
relates_to: docs/PRD-linear-e147ec4f-0860-4b18-91f6-22f16eaad06d.md
risk: high
owners:
  - Codex
last_review: 2026-03-25
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-e147ec4f-0860-4b18-91f6-22f16eaad06d.md`
- PRD: `docs/PRD-linear-e147ec4f-0860-4b18-91f6-22f16eaad06d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e147ec4f-0860-4b18-91f6-22f16eaad06d.md`
- Task checklist: `tasks/tasks-linear-e147ec4f-0860-4b18-91f6-22f16eaad06d.md`

## Traceability
- Linear issue: `CO-4` / `e147ec4f-0860-4b18-91f6-22f16eaad06d`
- Linear URL: https://linear.app/asabeko/issue/CO-4/co-add-symphony-style-follow-up-issue-automation

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: add a bounded worker-visible Linear helper that creates Symphony-style follow-up issues in the same project/team with `Backlog`, required `related`, optional blocker linkage, and surfaced created-issue metadata.
- Scope:
  - docs-first registration and workpad bootstrap for `CO-4`
  - follow-up issue creation in the provider Linear facade and CLI shell
  - audit/logging and prompt/skill updates needed to expose the new helper cleanly
  - focused regression coverage and the required validation/review sequence
- Constraints:
  - preserve worker-owned tracker mutation boundaries
  - fail closed when project context or `Backlog` state is unavailable
  - keep delegation evidence truthful by using a manifest-backed child stream for the top-level task and keeping any collab review streams read-only

## Technical Requirements
- Functional requirements:
  - the source issue must be read through the existing scoped issue-context path before any follow-up creation
  - successful follow-up creation must reuse the source issue team/project and resolve the live `Backlog` state from the team workflow
  - the helper must require a title, description, and acceptance criteria and compose a follow-up issue body that preserves those sections clearly
  - successful runs must create a `related` relation from the source issue to the new issue
  - when explicitly requested, successful runs must also create a blocker relation such that the new issue is blocked by the source issue
  - the result must include the created issue id, identifier, URL, team/project info, and created relation metadata
  - failure after issue creation must surface created issue metadata in error details so workers can recover truthfully
- Non-functional requirements (performance, reliability, security):
  - reuse the current Linear auth, timeout, and scoped source setup resolution
  - preserve existing CLI JSON output and audit-trail patterns
  - keep the new operation narrow and deterministic enough for auditability
- Interfaces / contracts:
  - new `codex-orchestrator linear create-follow-up --issue-id ...` CLI contract
  - provider Linear audit trail contract gains a new `create-follow-up` operation
  - provider-worker prompt and repo-local Linear skill must describe when/how to use the helper for out-of-scope follow-ons

## Architecture & Data
- Architecture / design adjustments:
  - add a `create-follow-up` operation alongside the existing Linear helper operations in `providerLinearWorkflowFacade.ts` and `linearCliShell.ts`
  - keep issue creation scoped to the current issue context rather than permitting arbitrary team/project inputs
  - implement a small body formatter that writes the follow-up description plus an `## Acceptance Criteria` section
  - add relation helpers for `related` and `blocks`
- Data model changes / migrations:
  - no persisted repo data migrations
  - JSON result and audit-entry shapes gain created issue / relation metadata for the new operation
- External dependencies / integrations:
  - live Linear GraphQL schema confirms `issueCreate`, `issueRelationCreate`, `IssueCreateInput`, and `IssueRelationType`
  - Symphony workflow requirement for same-project `Backlog` follow-up issues

## Validation Plan
- Tests / checks:
  - docs-review on the new packet before implementation edits
  - focused facade tests for create success, optional blocker linkage, missing-project safeguards, and failure after create/relation mutation
  - focused CLI shell tests for argument routing and audit-entry recording
  - required repo validation floor after implementation
- Rollout verification:
  - verify the new command can create a same-project `Backlog` follow-up issue with the expected output shape
  - verify provider worker docs/prompt text tells workers to file a separate follow-up instead of widening scope
  - attach the PR before any review handoff
- Monitoring / alerts:
  - use the existing provider Linear audit path for helper-attempt evidence
  - keep the single Linear workpad current with created follow-up references during real worker usage

## Open Questions
- Whether future parity work should add richer templates for follow-up issue bodies; not required for this slice.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-25

## Manifest Evidence
- Baseline audit: `out/linear-e147ec4f-0860-4b18-91f6-22f16eaad06d/manual/20260325T070431Z-baseline-audit.md`
- Delegated diagnostics child stream: `.runs/linear-e147ec4f-0860-4b18-91f6-22f16eaad06d-guard/cli/2026-03-25T07-53-02-243Z-f7c8d97d/manifest.json`
