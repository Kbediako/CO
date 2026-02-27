# TECH_SPEC - PR 263 Codex Feedback Follow-up (0984)

## Summary
- Objective: close the two valid unresolved Codex findings from PR #263 and harden process controls that allowed merge with actionable unresolved feedback.
- Scope: minimal runtime selector + canary env-sanitization fixes, targeted regression tests, docs/process updates.
- Constraints: preserve appserver default, cloud guardrails, fallback semantics, and CLI break-glass.

## Technical Requirements
- Functional requirements:
  - Cloud execution with no explicit runtime flag must remain cloud-compatible even when global default runtime is appserver.
  - Runtime canary baseline environment must clear runtime override env vars before scenario-specific env merges.
  - Task/checklist docs must include incident timeline and explicit prevention controls.
- Non-functional requirements:
  - No behavior regression for explicit `--runtime-mode appserver` + `--execution-mode cloud` (must still fail fast with actionable error).
  - Deterministic canary outputs across developer and CI environments.

## Architecture & Data
- Architecture / design adjustments:
  - Adjust runtime selection request path for cloud execution to prefer CLI runtime when runtime mode source is implicit default.
  - Add helper in canary script to sanitize runtime override variables from inherited env.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - Existing tests and canary workflows.

## Validation Plan
- Tests / checks:
  - Add/adjust runtime selection tests for cloud + default mode behavior.
  - Add canary env sanitization coverage.
  - Run ordered guardrail/validation gates (1-10).
- Rollout verification:
  - Verify manifests and canary summaries show expected runtime mode behavior.
- Monitoring / alerts:
  - Use PR thread checks and quiet-window policy with explicit unresolved-actionable-thread check.

## Risks & Mitigations
- Risk: silently changing requested runtime in cloud path could hide explicit user intent.
  - Mitigation: only apply compatibility behavior when runtime mode is from implicit default; preserve explicit flag/env/config intent and fail fast for unsupported combos.
- Risk: canary env sanitization removes needed variables.
  - Mitigation: target only runtime-mode override keys; leave unrelated env untouched.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-27
