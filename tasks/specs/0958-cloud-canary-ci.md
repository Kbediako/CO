---
id: 20260213-0958-cloud-canary-ci
title: Cloud Execution Canary CI Coverage
relates_to: docs/PRD-cloud-canary-ci.md
risk: medium
owners:
  - Codex
last_review: 2026-02-13
---

## Summary
- Objective: Add CI canary coverage that continuously validates cloud-mode execution wiring and manifest evidence.
- Scope: Cloud canary trigger path, manifest assertions, CI diagnostics, and docs/checklist alignment.
- Constraints: Preserve local-mode behavior and avoid implicit cloud apply.

## Technical Requirements
- Functional requirements:
  - Add a CI-capable cloud canary command path using orchestrator `--execution-mode cloud`.
  - Validate cloud lifecycle evidence in manifests (`task_id`, terminal `status`, poll metadata where available).
  - Validate run-summary cloud projection remains populated and schema-compatible.
  - Emit actionable diagnostics for credential or connectivity failures.
- Non-functional requirements (performance, reliability, security):
  - Canary runtime must be bounded by explicit timeout/retry limits.
  - Sensitive cloud tokens/identifiers must not leak in logs beyond existing policy.
  - Credential-gated behavior must be explicit and deterministic.
- Interfaces / contracts:
  - CI workflow/job definition for cloud canary execution.
  - Existing manifest schema contracts (`cloud_execution`) remain additive-compatible.

## Architecture and Data
- Architecture / design adjustments:
  - Reuse existing cloud execution path and add CI orchestration glue + assertion harness.
  - Keep canary isolated from broad local-core lane semantics.
- Data model changes / migrations:
  - No schema migration required for MVP; validate existing `cloud_execution` schema usage.
  - Optional follow-up: add explicit `canary` metadata section if needed for observability.
- External dependencies / integrations:
  - Codex Cloud credentials in CI.
  - GitHub Actions workflow integration.

## Delivery Plan (Phased)
1. Canary scaffold and workflow wiring.
2. Manifest/run-summary assertion checks.
3. Failure taxonomy + diagnostics polish.

## Failure Modes and Mitigations
- Missing credentials in CI:
  - Mitigation: clear credential-gated status + diagnostics; policy-defined pass/skip behavior.
- Cloud endpoint transient failure:
  - Mitigation: bounded retries and explicit final failure categorization.
- Cloud fetch fails on local-only branch refs (`couldn't find remote ref ...`):
  - Mitigation: canary path defaults `CODEX_CLOUD_BRANCH` to `main` (overrideable) so cloud execution targets a guaranteed remote branch.
- Assertion drift from schema changes:
  - Mitigation: keep assertions tied to canonical shared manifest types and update in lockstep.

## Validation Plan
- Tests / checks:
  - CI canary workflow dry run (where possible).
  - Targeted assertions for manifest `cloud_execution` payload.
  - Guardrail chain for touched code/docs.
- Rollout verification:
  - Evidence manifest/log links captured in task checklist and docs snapshot.
- Monitoring / alerts:
  - Track canary pass/fail trend and top failure causes.

## Open Questions
- Should canary be required for merge or informational until stability baseline is established?
- Should canary target one canonical pipeline first or multiple targets in phase 1?

## Evidence
- Planning scout / delegation evidence: `.runs/0958-cloud-canary-ci-scout/cli/2026-02-13T12-05-36-992Z-d291cfe9/manifest.json`
- Docs-review (pre-implementation): `.runs/0958-cloud-canary-ci/cli/2026-02-13T12-07-32-909Z-8cf7dbba/manifest.json`
- Implementation-gate: `.runs/0958-cloud-canary-ci/cli/2026-02-13T13-09-22-859Z-a9289881/manifest.json`
- Cloud canary pass with branch pinning: `.runs/0958-cloud-canary-ci-local8/cli/2026-02-13T12-32-10-598Z-8519cfd2/manifest.json`
- Cloud command log proving `--branch main`: `.runs/0958-cloud-canary-ci-local8/cli/2026-02-13T12-32-10-598Z-8519cfd2/cloud/commands.ndjson`
- Reviewer hand-off (`npm run review` with `NOTES`): `.runs/0958-cloud-canary-ci/cli/2026-02-13T13-09-22-859Z-a9289881/manifest.json`

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-13
