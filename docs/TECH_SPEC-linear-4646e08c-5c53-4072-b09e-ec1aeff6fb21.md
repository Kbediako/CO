---
id: 20260328-linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21
title: Fix Repeated Post-Merge Core Lane Failures in ProviderIssueHandoff and CLI Command Surface Suites
relates_to: docs/PRD-linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md
risk: high
owners:
  - Codex
last_review: 2026-03-28
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`
- PRD: `docs/PRD-linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`
- Task checklist: `tasks/tasks-linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`

## Traceability
- Linear issue: `CO-31` / `4646e08c-5c53-4072-b09e-ec1aeff6fb21`
- Linear URL: https://linear.app/asabeko/issue/CO-31/co-fix-repeated-post-merge-core-lane-failures-in-providerissuehandoff

## Summary
- Objective: Explain and remove the repeated post-merge `Core Lane` failures on the CO-24 merge head without widening into unrelated harness churn.
- Scope:
  - docs-first registration for `CO-31`
  - artifact-backed review of GitHub Actions run `23680994977` / job `68994221283`
  - local reproduction or durable root-cause evidence on merge head `b81084ed121a59ca98f2b522ca1b5b602ceb54e8` or current `main`
  - the smallest fix across provider lifecycle/test isolation/CLI subprocess handling
  - focused regression coverage and full validation before review handoff
- Constraints:
  - do not revert CO-24 without stronger evidence
  - do not accept targeted green results if the full-lane shared failure shape remains unexplained
  - keep the diff bounded to the proven owner

## Technical Requirements
- Functional requirements:
  - reproduce or otherwise root-cause the repeated post-merge failure with durable evidence
  - explain the `ProviderIssueHandoff` queued-retry refetch stall and the three late CLI shell timeouts as either one shared interaction or separate but co-triggered issues
  - patch the smallest responsible seam so the early provider test and late CLI command-surface cases terminate cleanly under CI-relevant conditions
  - add focused regression coverage for the exact failing seams and any required ordering/isolation guard
  - state clearly in closeout whether the failure was a CO-24 regression, a preexisting instability, or a mixed timing interaction
- Non-functional requirements (performance, reliability, security):
  - preserve truthful lane timing and subprocess behavior rather than hiding hangs behind longer blanket timeouts
  - keep nearby provider/CLI contracts stable unless evidence requires change
  - keep evidence auditable in repo artifacts and manifests
- Interfaces / contracts:
  - `npm run test` / `vitest.config.core.ts` remains the authoritative core-lane local equivalent
  - `tests/cli-command-surface.spec.ts` binary-shell helpers must terminate deterministically and not inherit leaked state from earlier suites
  - `ProviderIssueHandoff` retry sequencing must remain deterministic across isolated and full-suite execution

## Architecture & Data
- Architecture / design adjustments:
  - start from the authoritative CI log, then narrow locally with focused runs, ordered combinations, and direct code inspection around retry scheduling and CLI subprocess lifecycle
  - prefer deterministic cleanup/isolation fixes at the exact seam over broad global timeout increases
  - preserve durable notes under `out/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/manual/`
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - GitHub Actions run `23680994977`
  - Vitest
  - Node child process / timer / event-loop behavior
  - provider workflow and CLI binary shell surfaces

## Validation Plan
- Tests / checks:
  - docs-review before implementation
  - focused reproductions against `ProviderIssueHandoff` and `cli-command-surface`
  - ordered or repeated focused runs if required to surface the shared interaction
  - full required validation floor after implementation
- Rollout verification:
  - confirm the same four-test failure shape is either reproduced or conclusively root-caused
  - confirm the fix head passes the focused seams and the full `Core Lane` equivalent
  - confirm closeout states the right root-cause classification
- Monitoring / alerts:
  - durable reproduction and validation notes in `out/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/manual/`
  - workpad updates when the Linear write path is healthy again, or explicit blocker notes if it is not

## Open Questions
- Is there a single leaked timer/subprocess/resource that explains both failure clusters?
- Do the late CLI timeouts only surface after the provider suite mutates shared runtime state?
- Does the smallest safe fix live in tests, runtime lifecycle code, or an interaction between both?

## Approvals
- Reviewer: docs-review manifest `/Users/kbediako/Code/CO/.runs/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/cli/2026-03-28T09-20-51-476Z-b169d281/manifest.json`; final standalone review clean at `/Users/kbediako/Code/CO/.runs/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/cli/2026-03-28T09-08-12-918Z-060f9d7e/review/output.log`
- Date: 2026-03-28
