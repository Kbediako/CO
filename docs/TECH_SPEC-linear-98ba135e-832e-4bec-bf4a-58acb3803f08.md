---
id: 20260330-linear-98ba135e-832e-4bec-bf4a-58acb3803f08
title: CO: Clarify bounded-success vs failed review-wrapper outcomes for operators
relates_to: docs/PRD-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md
risk: high
owners:
  - Codex
last_review: 2026-03-30
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`
- PRD: `docs/PRD-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`
- Task checklist: `tasks/tasks-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`

## Traceability
- Linear issue: `CO-28` / `98ba135e-832e-4bec-bf4a-58acb3803f08`
- Linear URL: https://linear.app/asabeko/issue/CO-28/co-clarify-bounded-success-vs-failed-review-wrapper-outcomes-for

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make standalone-review operator surfaces tell the truth about bounded-success review completion versus actual review-wrapper failure.
- Scope:
  - docs-first registration and current-state audit for `CO-28`
  - narrow telemetry/log/summary shaping for explicit review terminal outcome classification
  - provider-worker prompt plus repo-local workflow guidance alignment for workpad/review closeout semantics
  - focused regressions on the presentation and interpretation seam
- Constraints:
  - preserve the existing `termination_boundary` family contract
  - do not reopen broader CO-16 runtime policy or the cancelled CO-24 repo-test blocker
  - keep the change bounded to operator-facing interpretation surfaces

## Technical Requirements
- Functional requirements:
  - review telemetry must expose an explicit terminal outcome classification such as `clean-success`, `bounded-success`, `failed-boundary`, or equivalent
  - successful bounded completion must preserve the existing boundary family/provenance while classifying the overall review outcome as success
  - wrapper summary output and downstream review-stage summaries must describe bounded-success clearly enough that operators do not read it as wrapper failure
  - worker-facing prompt/skill/docs text must instruct workpad and closeout authors not to call succeeded bounded reviews blockers or generic quiet-tail failures
- Non-functional requirements (performance, reliability, security):
  - keep the change deterministic, auditable, and local to current review outcome surfaces
  - preserve machine-checkable failure-family semantics for real review-wrapper failures
  - avoid changing review-runtime guard thresholds or introducing new heavy validation behavior
- Interfaces / contracts:
  - `scripts/lib/review-execution-telemetry.ts`
  - `scripts/lib/review-launch-attempt.ts`
  - `orchestrator/src/cli/services/commandRunner.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `skills/linear/SKILL.md`
  - `docs/standalone-review-guide.md`

## Architecture & Data
- Architecture / design adjustments:
  - layer a compact terminal-outcome classification on top of the existing `status` plus `termination_boundary` contract
  - reuse the same classification in wrapper log output and downstream review-stage summary shaping
  - keep worker-facing guidance aligned with the new telemetry/summary truth so manual workpad or closeout notes stay consistent
- Data model changes / migrations:
  - `review/telemetry.json` gains an explicit terminal-outcome field for review completion semantics
  - no migration beyond updated readers and tests on the current tree
- External dependencies / integrations:
  - shared review artifacts under `/Users/kbediako/Code/CO/.runs/**/review/telemetry.json`
  - Linear provider-worker prompt/skill consumers

## Validation Plan
- Tests / checks:
  - docs-review via `linear child-stream --pipeline docs-review`
  - focused regressions in review telemetry/log/summary and provider-worker prompt surfaces
  - required repo validation floor after implementation
- Rollout verification:
  - confirm the issue's three baseline review artifacts map cleanly to `clean-success`, `bounded-success`, and failed-boundary interpretations
  - confirm review-stage summaries now surface bounded success distinctly from failure
  - confirm worker-facing guidance now tells operators how to record the difference in workpads or closeout notes
- Monitoring / alerts:
  - rely on review telemetry artifacts plus manifest/run-summary stage summaries as the operator-visible evidence source

## Open Questions
- Resolved in planning: keep unrelated non-review blockers outside the review telemetry contract; the fix here is to make successful review completion explicit so later blockers are visibly separate.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-30
