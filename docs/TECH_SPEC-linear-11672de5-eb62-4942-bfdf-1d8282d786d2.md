---
id: 20260403-linear-11672de5-eb62-4942-bfdf-1d8282d786d2
title: CO: Deduplicate child-lane trailing JSON-tail parsing with shared helper
relates_to: docs/PRD-linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md
risk: high
owners:
  - Codex
last_review: 2026-04-03
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`
- PRD: `docs/PRD-linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`
- Task checklist: `tasks/tasks-linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`

## Traceability
- Linear issue: `CO-68` / `11672de5-eb62-4942-bfdf-1d8282d786d2`
- Linear URL: https://linear.app/asabeko/issue/CO-68/co-deduplicate-child-lane-trailing-json-tail-parsing-with-shared
- Source issue: `CO-50` / `6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: replace the child-lane shell’s local trailing JSON-tail parser with the shared helper introduced by `CO-50`.
- Scope:
  - docs-first packet registration for `CO-68`
  - one call-site update in `providerLinearChildLaneShell.ts`
  - focused child-lane regression coverage
  - required validation and review gates
- Constraints:
  - preserve strict fail-closed object-only parsing
  - preserve child-lane returned payload normalization and path confinement
  - avoid unrelated provider-worker parsing cleanup or child-lane behavior changes

## Technical Requirements
- Functional requirements:
  - `parseProviderChildLaneRunResult(...)` must call `parseTrailingJsonObject(...)` from `orchestrator/src/cli/utils/trailingJsonObject.ts`
  - child-lane parsing must stay on the helper’s strict default mode rather than the delegation-server trailing-text compatibility mode
  - successful parsing must continue to normalize `run_id`, `status`, `artifact_root`, `manifest`, and optional `log_path` into the existing `ProviderLinearChildLaneRunResult`
  - path confinement checks must still reject artifact, manifest, or log paths outside the expected child run root
  - focused tests must prove prelude-log success and malformed-final-payload failure in the child-lane seam
- Non-functional requirements:
  - fail closed for malformed, truncated, empty, or non-object payloads
  - keep the solution minimal: shared helper import plus narrow test additions
  - do not reintroduce duplicate parser logic in the child-lane shell
- Interfaces / contracts:
  - helper location: `orchestrator/src/cli/utils/trailingJsonObject.ts`
  - call site: `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - tests: `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - remove the local `parseTrailingJsonObject(...)` implementation from `providerLinearChildLaneShell.ts`
  - keep the child-lane shell responsible for field normalization and confinement checks after the shared helper returns an object
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - none beyond the existing shared helper and child-lane test surface

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused `ProviderLinearChildLaneShell.test.ts` coverage for prelude-log success and malformed-final-payload failure
  - required repo validation floor after implementation
  - manifest-backed standalone review followed by explicit elegance review before handoff
- Rollout verification:
  - confirm the child-lane shell imports the shared helper
  - confirm malformed final payloads still fail closed before normalization or confinement succeeds
- Monitoring / alerts:
  - no new runtime monitoring; rely on focused regressions and review evidence

## Open Questions
- None at bootstrap.

## Approvals
- Reviewer: `codex-orchestrator docs-review`
- Date: 2026-04-03
