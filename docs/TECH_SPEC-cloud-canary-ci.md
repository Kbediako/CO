# Technical Spec - Cloud Execution Canary CI Coverage (Task 0958)

## Summary
- Objective: Add CI canary coverage for cloud execution mode to catch wiring regressions early.
- Scope: Canary trigger path, manifest assertions, diagnostics, and rollout policy.
- Constraints: Preserve local path behavior and keep cloud apply explicit.
- Canonical TECH_SPEC: `tasks/specs/0958-cloud-canary-ci.md`.

## Technical Requirements
- Functional requirements:
  - CI canary executes orchestrator in cloud mode.
  - Assertions verify manifest `cloud_execution` lifecycle output.
  - Failures include actionable diagnostics and artifact pointers.
- Non-functional requirements (performance, reliability, security):
  - Deterministic timeout/retry bounds.
  - Credential-safe logging.
  - Explicit behavior when credentials are unavailable.
- Interfaces / contracts:
  - CI workflow contract and manifest assertion contract.

## Architecture & Data
- Architecture / design adjustments:
  - Reuse cloud execution path; add canary assertion harness and CI wiring.
- Data model changes / migrations:
  - No required schema migration for MVP.
- External dependencies / integrations:
  - Codex Cloud credentials and CI runner environment.

## Validation Plan
- Tests / checks:
  - Cloud canary workflow validation.
  - Manifest assertion checks for `cloud_execution`.
  - Standard guardrail sequence for touched files.
- Rollout verification:
  - Capture canary evidence links in task docs.
- Monitoring / alerts:
  - Watch canary pass/fail trend and recurrent error classes.

## Open Questions
- Merge-gating policy for cloud canary.
- Required branch cadence (every PR vs schedule).

## Evidence
- Planning scout / delegation: `.runs/0958-cloud-canary-ci-scout/cli/2026-02-13T12-05-36-992Z-d291cfe9/manifest.json`
- Docs-review (pre-implementation): `.runs/0958-cloud-canary-ci/cli/2026-02-13T12-07-32-909Z-8cf7dbba/manifest.json`
- Implementation-gate: `.runs/0958-cloud-canary-ci/cli/2026-02-13T13-09-22-859Z-a9289881/manifest.json`
- Cloud canary pass with branch pinning: `.runs/0958-cloud-canary-ci-local8/cli/2026-02-13T12-32-10-598Z-8519cfd2/manifest.json`

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-13
