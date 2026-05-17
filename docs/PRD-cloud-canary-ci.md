# PRD - Cloud Execution Canary CI Coverage

## Summary
- Problem Statement: Cloud execution wiring is now functional, but CO does not yet have a CI canary that validates cloud-mode wiring and manifest output on an ongoing basis.
- Desired Outcome: Add a reliable CI canary path that exercises `--execution-mode cloud` and verifies cloud lifecycle evidence so regressions are caught before release.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Build on the merged cloud wiring work by establishing a next-step quality path that keeps cloud behavior stable and observable.
- Success criteria / acceptance:
  - A CI canary path exists for cloud execution wiring and runs in non-interactive mode.
  - Canary output validates key `cloud_execution` manifest fields (task id/status lifecycle and summary mapping).
  - Failures are actionable with clear diagnostics and manifest links.
- Constraints / non-goals:
  - Do not require destructive cloud apply behavior.
  - Do not block unrelated local-only pipelines if cloud credentials are intentionally unavailable.
  - Keep scope focused on canary coverage and operator clarity.

## Goals
- Add a cloud-mode canary validation path suitable for CI environments.
- Assert cloud lifecycle evidence shape in manifests/run summaries.
- Document operator expectations for credential-gated cloud checks.

## Non-Goals
- Broad redesign of existing pipeline orchestration.
- Expanding canary to cover every pipeline target in this iteration.
- Changing local (`mcp`) execution defaults.

## Stakeholders
- Product: CO maintainers and operators relying on cloud-mode stability.
- Engineering: Orchestrator runtime, CI workflow maintainers, manifest consumers.
- Design: N/A.

## Metrics and Guardrails
- Primary Success Metrics:
  - Cloud canary executes and records manifest evidence when credentials are present.
  - Canary assertions detect cloud lifecycle regressions before merge.
  - No local-mode regression introduced by canary wiring.
- Guardrails / Error Budgets:
  - Credential-missing scenarios should produce explicit skipped/blocked diagnostics.
  - Cloud canary should remain deterministic and bounded (timeouts/retries constrained).

## User Experience
- Personas:
  - Maintainers reviewing CI status and run manifests.
  - Operators validating cloud execution behavior in release preparation.
- User Journeys:
  - Push/update PR -> CI cloud canary runs (or explicitly reports credential-gated skip) -> reviewer checks manifest assertions.

## Technical Considerations
- Architectural Notes:
  - Reuse orchestrator cloud execution mode (`--execution-mode cloud`) as canary entrypoint.
  - Add assertion checks for manifest `cloud_execution` payload and run summary projection.
  - Capture CI artifacts/log pointers for quick diagnostics.
- Dependencies / Integrations:
  - Codex cloud credentials available in CI context.
  - Existing CI workflow and guardrail scripts.

## Open Questions
- Should cloud canary run on every PR or only on protected branches/nightly when credentials are available?
- Should credential-missing conditions mark the check as skipped or soft-failed?
- What minimum cloud lifecycle assertions are required for MVP confidence?

## Evidence
- Planning scout / delegation: `.runs/0958-cloud-canary-ci-scout/cli/2026-02-13T12-05-36-992Z-d291cfe9/manifest.json`
- Docs-review (pre-implementation): `.runs/0958-cloud-canary-ci/cli/2026-02-13T12-07-32-909Z-8cf7dbba/manifest.json`
- Implementation-gate: `.runs/0958-cloud-canary-ci/cli/2026-02-13T13-09-22-859Z-a9289881/manifest.json`
- Cloud canary validation: `.runs/0958-cloud-canary-ci-local8/cli/2026-02-13T12-32-10-598Z-8519cfd2/manifest.json`
- Branch pin proof (`--branch main`): `.runs/0958-cloud-canary-ci-local8/cli/2026-02-13T12-32-10-598Z-8519cfd2/cloud/commands.ndjson`

## Approvals
- Product: Maintainer-approved
- Engineering: Codex (self)
- Design: N/A
