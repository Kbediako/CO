---
id: 20260425-linear-co-373-cloudpreflight-flake
title: CO-373 CloudPreflight fake Codex CLI test flake stabilization
status: in_progress
owner: Codex
created: 2026-04-25
last_review: 2026-06-17
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-co-373-cloudpreflight-flake.md
related_action_plan: docs/ACTION_PLAN-linear-co-373-cloudpreflight-flake.md
related_tasks:
  - tasks/tasks-linear-co-373-cloudpreflight-flake.md
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-04-25: Opened from observed Core Lane failures in PR #668 and CO-361 release-prep validation; issue blocks CO-361 until the harness is fixed and CI evidence is green.
  - 2026-04-25: Micro-task path is intentionally not used because correctness depends on exact CloudPreflight classification surfaces and release-blocker truth.
  - 2026-05-18: CO-522 active-spec audit found 6 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Summary
- Objective: make CloudPreflight cloud-list tests deterministic under full Core Lane execution.
- Scope:
  - `orchestrator/tests/CloudPreflight.test.ts`
  - `orchestrator/src/cli/utils/cloudPreflight.ts` only if inspection proves a product bug
  - docs-first registration and validation evidence for CO-373
- Constraints:
  - preserve `codex_unavailable` for real `codex --version` failures
  - preserve `environment_unavailable`, `environment_not_found`, and `missing_environment` semantics
  - keep changes narrow to the fake Codex CLI test harness and directly related coverage

## Issue-Shaping Contract
- User-request translation carried forward: the release lane should not proceed by rerunning flaky CI; observed blockers need explicit Linear implementation work, validation, and shepherding to Done.
- Protected terms / exact artifact and surface names: `CO-361`, `CO-373`, `PR #668`, `Core Lane`, `CloudPreflight.test.ts`, `runCloudPreflight`, `runCommand`, `codex --version`, `codex cloud list`, and `codex_unavailable`.
- Nearby wrong interpretations to reject:
  - treating this as release-note work
  - changing product classification to make tests pass
  - skipping or loosening CloudPreflight assertions
  - tagging CO-361 before archive/Core evidence is clean
- Explicit non-goals carried forward:
  - no release publication or package version change
  - no cloud-canary policy change
  - no Codex model posture change
  - no broad provider-worker or archive automation redesign

## Parity / Alignment Matrix
- Current truth: CI can reach a false `codex_unavailable` result from the fake CLI `--version` step in tests that are intended to validate cloud-list environment classification.
- Reference truth: fake CLI tests should isolate CloudPreflight classification logic, while separate coverage proves command startup/version failures remain `codex_unavailable`.
- Target truth / intended delta: cloud-list-focused tests always reach the fake `codex cloud list` path unless the product code intentionally aborts for a real unavailable CLI.
- Explicitly out-of-scope differences: release note content, npm publish flow, archive policy, and cloud execution mode semantics.

## Readiness Gate
- Not done if:
  - the patch only reruns failed checks
  - cloud-list tests can still fail before the fake `cloud list` branch
  - real CLI unavailability no longer returns `codex_unavailable`
  - focused and CI-shaped CloudPreflight validation are not recorded
- Pre-implementation issue-quality review evidence: parent reviewed the repeated CI failure signatures, created Linear CO-373, linked it as blocking CO-361, and preserved the exact classification surfaces before implementation.
- Safeguard ownership split: worker subagent owns the CloudPreflight harness patch; parent owns docs, Linear state, PR/CI monitoring, and release continuation.

## Technical Requirements
- Functional requirements:
  1. Ensure fake Codex CLI fixtures used by cloud-list tests respond deterministically to `--version`.
  2. Ensure the same fixtures record or prove the intended `cloud list` invocation when classification assertions depend on it.
  3. Preserve existing tests for synchronous spawn failure and unavailable Codex CLI behavior.
  4. Keep CloudPreflight issue-code assertions strict for `environment_unavailable`, `environment_not_found`, and `missing_environment`.
- Non-functional requirements (performance, reliability, security):
  - no sleeps or unbounded retries in tests
  - no network calls in unit tests
  - no raw secret output in failure messages
- Interfaces / contracts:
  - `runCloudPreflight(params: CloudPreflightRequest): Promise<CloudPreflightResult>`
  - fake Codex executable contract for `--version`, `cloud list`, and `cloud exec`
  - GitHub Core Lane `npm run test:core`

## Architecture & Data
- Architecture / design adjustments: prefer a deterministic test executable or fixture helper over product code changes. If product code changes are required, keep them additive and maintain the existing unavailable-command result path.
- Data model changes / migrations: none.
- External dependencies / integrations: Node temporary directories, executable fixtures, Vitest, GitHub Actions Core Lane, and tasks archive automation.

## Validation Plan
- Tests / checks:
  - `npm run test:core -- orchestrator/tests/CloudPreflight.test.ts`
  - `CI=1 npm run test:core -- orchestrator/tests/CloudPreflight.test.ts`
  - full Core Lane on the PR
  - docs/spec guards required by the repo lane
  - standalone review or bounded reviewer pass before merge
- Rollout verification:
  - confirm PR #668 or replacement archive PR Core Lane is no longer blocked by this flake
  - confirm CO-361 remains blocked until CO-373 is merged and release evidence is green
- Monitoring / alerts:
  - track GitHub run URLs in Linear CO-373 and CO-361 comments

## Open Questions
- None blocking. Implementation may choose the smallest deterministic fake CLI pattern after inspection.

## Approvals
- Reviewer: Orchestrator pre-implementation review.
- Date: 2026-04-25
