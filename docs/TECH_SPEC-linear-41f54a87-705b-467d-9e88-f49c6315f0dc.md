---
id: 20260324-linear-41f54a87-705b-467d-9e88-f49c6315f0dc
title: Workflow Reload with Last Known Good Fallback
relates_to: docs/PRD-linear-41f54a87-705b-467d-9e88-f49c6315f0dc.md
risk: high
owners:
  - Codex
last_review: 2026-03-24
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-41f54a87-705b-467d-9e88-f49c6315f0dc.md`
- PRD: `docs/PRD-linear-41f54a87-705b-467d-9e88-f49c6315f0dc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-41f54a87-705b-467d-9e88-f49c6315f0dc.md`
- Task checklist: `tasks/tasks-linear-41f54a87-705b-467d-9e88-f49c6315f0dc.md`

## Traceability
- Linear issue: `CO-6` / `41f54a87-705b-467d-9e88-f49c6315f0dc`
- Linear URL: https://linear.app/asabeko/issue/CO-6/co-add-workflow-reload-with-last-known-good-fallback

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Add Symphony-style startup-fail-closed and runtime-last-known-good reload behavior for the CO control-host provider workflow/config seam.
- Scope:
  - docs-first registration for the current Linear worker issue
  - a control-host workflow/config store for repo-local `codex.orchestrator.json`
  - provider child-launch wiring that consumes the cached effective config snapshot
  - operator-visible reload health surfaced through current control-host observability
  - focused regression coverage and validation
- Constraints:
  - keep the fix narrow to the provider workflow/config path
  - do not invent a new CO `WORKFLOW.md`; use the real repo-config seam that exists today
  - record delegation override explicitly because this worker run cannot spawn subagents
  - replay the feature on a fresh `Rework` branch from `origin/main` and close the two remaining store gaps from the prior PR sweep before returning to review

## Technical Requirements
- Functional requirements:
  - control-host startup must fail if the repo-local provider workflow/config is missing or invalid
  - after startup, a failed reload must keep the last known good effective provider workflow/config available for provider child launches
  - a later valid config edit must replace the stored snapshot and clear any sticky error state
  - reload failures must be logged and visible through the operator observability surface
  - transient reload failures must be retried on the next refresh even when the source file metadata is unchanged
  - provider launches must verify the cached snapshot path still exists and recreate it from the current valid source config when necessary
- Non-functional requirements (performance, reliability, security):
  - preserve existing behavior for unrelated CLI/config consumers unless this provider path explicitly opts into stricter repo-config handling
  - keep snapshot management local to the control-host run state and avoid secret-bearing new persistence
  - keep the implementation small enough for direct audit and rollback
- Interfaces / contracts:
  - config input contract: repo-local `codex.orchestrator.json` plus the required `provider-linear-worker` pipeline definition
  - control-host contract: workflow/config store exposes current effective snapshot, latest reload status, and reload/recovery behavior
  - provider-launch contract: child starts/resumes receive an explicit config path pointing at the cached effective snapshot when needed
  - observability contract: control-host state includes provider workflow health with current status and last error details

## Architecture & Data
- Architecture / design adjustments:
  - introduce a control-host provider workflow/config store that validates and snapshots the effective provider config at startup, then monitors reload attempts against the source repo config
  - add a repo-config path override in config loading so provider child runs can consume the cached last-known-good snapshot instead of rereading the broken source file
  - thread the workflow health state into existing observability read models/controllers
- Data model changes / migrations:
  - add local control-host snapshot metadata and status fields only; no migration expected
- External dependencies / integrations:
  - local repo config loader
  - control-host lifecycle and provider handoff
  - existing observability API/state surfaces

## Validation Plan
- Tests / checks:
  - docs-review on the new task packet before code edits
  - focused tests for startup failure, good-to-bad retention, and bad-to-good recovery
  - required repo validation floor after implementation
- Rollout verification:
  - verify startup fail-closed behavior with invalid or missing config
  - verify provider child launches still resolve against the last good snapshot after a bad reload
  - verify observability shows degraded status until a later valid reload clears it
- Monitoring / alerts:
  - control-host logs for reload failures
  - control-host observability state for current health

## Open Questions
- The precise observability field placement remains implementation-defined; use the smallest surface that is already visible to operators through current state reads.

## Approvals
- Reviewer: explicit docs-review override captured after non-terminal bundled review
- Date: 2026-03-24

## Manifest Evidence
- Docs-review override: `out/linear-41f54a87-705b-467d-9e88-f49c6315f0dc/manual/20260324T000629Z-docs-first/05-docs-review-override.md`
- Deterministic docs gates: `out/linear-41f54a87-705b-467d-9e88-f49c6315f0dc/manual/20260324T000629Z-docs-first/01-delegation-guard.log`, `out/linear-41f54a87-705b-467d-9e88-f49c6315f0dc/manual/20260324T000629Z-docs-first/02-spec-guard.log`, `out/linear-41f54a87-705b-467d-9e88-f49c6315f0dc/manual/20260324T000629Z-docs-first/03-docs-check.log`, `out/linear-41f54a87-705b-467d-9e88-f49c6315f0dc/manual/20260324T000629Z-docs-first/04-docs-freshness.log`, and `out/linear-41f54a87-705b-467d-9e88-f49c6315f0dc/manual/20260324T000629Z-docs-first/05-docs-review.log`
- Validation summary: pending fresh-branch replay of the implementation and required repo validation.
