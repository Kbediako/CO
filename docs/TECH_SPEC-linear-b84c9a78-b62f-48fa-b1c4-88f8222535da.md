---
id: 20260412-linear-b84c9a78-b62f-48fa-b1c4-88f8222535da
title: CO: harden control-host supervise restart against orphaned duplicate host burn
relates_to: docs/PRD-linear-b84c9a78-b62f-48fa-b1c4-88f8222535da.md
risk: high
owners:
  - Codex
last_review: 2026-04-12
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da.md`
- PRD: `docs/PRD-linear-b84c9a78-b62f-48fa-b1c4-88f8222535da.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b84c9a78-b62f-48fa-b1c4-88f8222535da.md`
- Task checklist: `tasks/tasks-linear-b84c9a78-b62f-48fa-b1c4-88f8222535da.md`

## Traceability
- Linear issue: `CO-163` / `b84c9a78-b62f-48fa-b1c4-88f8222535da`
- Linear URL: https://linear.app/asabeko/issue/CO-163/co-harden-control-host-supervise-restart-against-orphaned-duplicate

## Summary
- Objective: make supervised control-host restart fail closed against orphaned old host trees and stop stuck refresh loops from continuing issue-by-id burn after the restart boundary is already explicit.
- Scope:
  - docs-first registration for `CO-163`
  - deterministic cleanup/waiting around `control-host supervise restart`
  - restart/orphan owner evidence that stays machine-checkable
  - sticky stuck-refresh abort checks before later direct issue reads
  - focused tests and operator guidance
- Constraints:
  - preserve active provider worker safety
  - keep the existing ownership lock and dispatch-cap logic
  - keep timeout-only masking out of scope

## Issue-Shaping Contract
- User-request translation carried forward: supervised restart must not claim success while an old control-host is still alive, stuck refreshes must stop doing new issue-by-id work after `restart_required=true`, and the recovery path must not kill detached provider issue workers.
- Protected terms / exact artifact and surface names: `control-host supervise restart`, `control-host-owner.json`, `control-host-duplicate-owner.json`, `provider_refresh_lifecycle_stuck`, `dispatch_source_issue_by_id`, `restart_required`, `provider-linear-worker`.
- Nearby wrong interpretations to reject: timeout-only masking, generic rate-limit tuning, CO STATUS-only cosmetic changes, or collateral worker cleanup.
- Explicit non-goals carried forward: merge/review workflow changes, max-allowed policy changes, and broad launchd redesign.

## Parity / Alignment Matrix
- Not applicable as a formal parity lane.
- Current truth: supervised restart only requests `launchctl kickstart -k` and active poll loops can continue past the stuck boundary into later direct reads.
- Reference truth: restart succeeds only after old child cleanup and stuck loops stop before additional burn.
- Target truth / intended delta: restart helper enforces old child exit, poll loops respect a sticky abort seam, and operator/status guidance identifies the supervised child pid cleanly.
- Explicitly out-of-scope differences: request-budget policy, worker review/merge semantics, and timeout-budget widening.

## Readiness Gate
- Not done if:
  - restart reports success before prior child exit
  - old host pids can keep reading Linear after restart
  - stuck refresh can keep doing new direct issue-by-id calls
  - restart cleanup kills provider workers
- Pre-implementation issue-quality review evidence:
  - 2026-04-12: parent worker self-review confirmed the lane is narrower than another duplicate-host redesign. The required seam is supervision restart plus mid-refresh abort behavior, building on the already-landed CO-152 ownership lock instead of reopening that larger startup boundary.
- Safeguard ownership split:
  - parent lane owns the overlapping supervision/polling contract; same-issue child lanes stay serial this turn because restart cleanup, ownership diagnostics, and poll abort all converge on the same control-host surfaces.

## Technical Requirements
- Functional requirements:
  - `control-host supervise restart` must capture the previously tracked supervised child pid before restart, request launchd restart, and wait until the old child tree is gone before returning success
  - if launchd leaves the old child tree alive past the configured kill timeout, the restart path must force-clean only that old control-host tree and surface that cleanup in structured output
  - restart output or adjacent machine-readable evidence must include the old child pid and owner/process evidence relevant to orphaned duplicate diagnosis
  - once polling health is already stuck, the active refresh loop must stop before later direct issue reads or fresh discovery cause additional request burn
  - operator-visible status/runbook guidance must distinguish supervised control-host child pids from detached provider-linear-worker issue processes
- Non-functional requirements:
  - cleanup must be deterministic on local macOS and test fixtures
  - the abort seam must fail closed without requiring a process kill to stop new reads
  - additive status/docs changes must remain backward compatible
- Interfaces / contracts:
  - `control-host supervise restart --format json` payload additions for prior child cleanup evidence
  - existing ownership artifacts under the control-host run dir
  - additive status/runbook guidance under `control-host supervise status` and `docs/public/provider-onboarding.md`

## Architecture & Data
- Architecture / design adjustments:
  - extract a restart helper that reuses the existing tracked-pid/process-group cleanup logic with injectable dependencies for tests
  - add a refresh-abort callback or equivalent sticky abort seam from polling health into `providerIssueHandoff`
  - keep owner artifact reading additive rather than inventing a new restart-only artifact
- Data model changes / migrations:
  - no new persisted schema required beyond additive restart payload fields and existing owner artifacts
  - supervision state remains the source of the last tracked child pid
- External dependencies / integrations:
  - `launchctl kickstart -k`
  - `ps`-based process group / descendant inspection helpers already used for supervision cleanup
  - existing owner-artifact readers under `controlHostOwnership`

## Validation Plan
- Tests / checks:
  - focused supervision restart tests proving old child cleanup before success and no collateral worker kill path
  - focused provider refresh regression proving no additional direct issue reads after the stuck boundary
  - standard repo validation floor before review handoff
- Rollout verification:
  - deterministic test harness simulates a stuck refresh plus orphaned old child and shows restart either waits or force-cleans before success
  - owner-token/process evidence remains visible in duplicate or stale owner artifacts after restart races
  - status/runbook language explicitly identifies supervised child pid semantics
- Monitoring / alerts:
  - operators can use `control-host supervise status --format json` plus owner artifacts to distinguish host cleanup from worker processes during incidents

## Open Questions
- Whether the restart payload should include a compact owner summary directly, or only artifact paths plus prior/new child pid evidence for this lane.

## Approvals
- Reviewer: audited docs-review fallback clean (`.runs/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da-co-163-docs-review/cli/2026-04-12T15-55-23-100Z-6b52bdd3/manifest.json`)
- Date: 2026-04-12
