---
id: 20260425-linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b
title: 'CO: harden cloud preflight command spawn ETXTBSY handling'
relates_to: docs/PRD-linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md
risk: medium
owners:
  - Codex
last_review: 2026-04-25
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`
- PRD: `docs/PRD-linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`
- Task checklist: `tasks/tasks-linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make synchronous cloud preflight command-spawn failures resolve through the existing unavailable-result path instead of escaping `runCloudPreflight`.
- Scope:
  - `orchestrator/src/cli/utils/cloudPreflight.ts`
  - `orchestrator/tests/CloudPreflight.test.ts`
  - docs-first registration and validation evidence for CO-372
- Constraints:
  - preserve environment-id validation and branch/environment preflight semantics
  - preserve CO-354 doctor/default/init behavior
  - keep changes narrow to command-spawn hardening and focused coverage

## Issue-Shaping Contract
- User-request translation carried forward: harden `runCommand` so synchronous `spawn ETXTBSY` or an equivalent synchronous spawn throw becomes a structured preflight issue instead of an unhandled `runCloudPreflight` exception.
- Protected terms / exact artifact and surface names: `ETXTBSY`, `spawn`, `runCloudPreflight`, `runCommand`, `cloudPreflight.ts`, `CloudPreflight.test.ts`, `codex_unavailable`, `Core Lane`, `PR #656`, `run 24931102291`, `job 73008894727`.
- Nearby wrong interpretations to reject:
  - not a CO-354 `multi_agent_v2` config bug
  - not a request to weaken cloud preflight pass/fail semantics
  - not a request to hide real cloud environment failures
- Explicit non-goals carried forward:
  - no environment-id validation weakening
  - no CO-354 doctor/default/init changes
  - no skipped cloud preflight tests
  - no cloud execution/canary policy redesign

## Parity / Alignment Matrix
- Current truth: `runCommand` handles asynchronous child `error` events but can throw before those handlers exist when `spawn(...)` itself throws.
- Reference truth: command startup failures should classify as unavailable command results, and Codex CLI unavailability should surface as `codex_unavailable`.
- Target truth / intended delta: synchronous spawn failures are caught locally and shaped into the same command-result classification path.
- Explicitly out-of-scope differences: branch-missing behavior, environment id requirements, successful payload parsing, and cloud route fallback policy.

## Readiness Gate
- Not done if:
  - synchronous `spawn ETXTBSY` can still escape `runCloudPreflight`
  - the regression only covers asynchronous `error` events
  - success, missing environment, environment-not-found, or unavailable classifications drift
  - the patch weakens cloud preflight validation
- Pre-implementation issue-quality review evidence: parent inspected the Linear issue-context, confirmed no attached PR feedback sweep was required, recorded the pre-turn decomposition matrix in the workpad, and judged the issue broad enough to carry protected terms/non-goals without expanding scope.
- Safeguard ownership split: child lane owns `orchestrator/tests/CloudPreflight.test.ts`; parent owns docs, `orchestrator/src/cli/utils/cloudPreflight.ts`, integration, and final validation.

## Technical Requirements
- Functional requirements:
  - catch synchronous `spawn(...)` exceptions inside `runCommand`
  - return a `CommandResult` with non-zero `exitCode`, preserved stdout/stderr shape, and the spawn error message
  - let `runCloudPreflight` classify Codex CLI spawn failure as `codex_unavailable`
  - add focused regression coverage for `ETXTBSY` or a representative synchronous spawn throw
- Non-functional requirements (performance, reliability, security):
  - no extra subprocesses or retries
  - no broader child-process abstraction unless the existing test harness requires it
  - keep errors visible in stderr/result text rather than swallowing diagnostics
- Interfaces / contracts:
  - `runCloudPreflight(params: CloudPreflightRequest): Promise<CloudPreflightResult>`
  - `CloudPreflightIssue.code === "codex_unavailable"` for Codex CLI command-start failure
  - `CloudPreflight.test.ts` success and classification expectations

## Architecture & Data
- Architecture / design adjustments:
  - wrap `spawn(command, args, options)` in a local `try`/`catch` before stream/event setup
  - convert caught errors through a helper or inline formatter consistent with the existing child `error` path
  - keep timeout/kill handling unchanged for successfully spawned children
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - Node `child_process.spawn`
  - Vitest module mocking or existing test helper patterns

## Validation Plan
- Tests / checks:
  - docs-review child stream before implementation
  - focused `CloudPreflight.test.ts` rerun after implementation
  - targeted guard/build/lint/test/docs checks as required by repo policy
  - standalone review and explicit elegance/minimality pass before review handoff
- Rollout verification:
  - confirm the regression exercises a synchronous spawn throw and observes a structured preflight issue
  - confirm existing success, environment-not-found, and unavailable classifications remain green
- Monitoring / alerts:
  - keep the Linear workpad refreshed after docs, implementation, validation, review, and handoff milestones

## Open Questions
- Whether the least invasive test shape is module-level `spawn` mocking or a small injection seam. The implementation should choose the smallest pattern that preserves production behavior.

## Approvals
- Reviewer: Parent provider worker manual docs-review fallback after child stream docs:check baseline failure.
- Date: 2026-04-25
