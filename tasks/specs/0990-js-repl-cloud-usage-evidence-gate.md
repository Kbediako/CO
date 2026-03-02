---
id: 20260302-0990-js-repl-cloud-usage-evidence-gate
title: JS_REPL + Cloud Usage Evidence Gate
relates_to: docs/PRD-js-repl-cloud-usage-evidence-gate.md
risk: high
owners:
  - Codex
last_review: 2026-03-02
---

## Summary
- Objective: run broad dummy-repo local+cloud simulations before recommending `js_repl` usage policy, then apply approved global docs guidance updates.
- Scope: docs-first scaffolding, delegated planning/relevance streams, minimal automation for matrix execution, simulation evidence capture, and mirror synchronization.
- Constraints: no default-policy change for `js_repl` unless evidence gate passes.

## Technical Requirements
- Functional requirements:
  - Execute local dummy-repo matrix with runtime/fallback/unsupported-combo assertions.
  - Execute cloud required/fallback contracts under both `js_repl` enabled and disabled feature toggles.
  - Capture command-level evidence that cloud toggles propagate correctly.
  - Produce a consolidated summary with recommendation status (`adopt`, `defer`, or `hold`).
  - Update globally relevant guidance docs with explicit runtime/cloud compatibility posture.
- Non-functional requirements (performance, reliability, security):
  - Non-destructive workflow.
  - Reproducible logs under `out/0990-js-repl-cloud-usage-evidence-gate/manual/`.
  - Preserve existing runtime behavior and fallback safety.
- Interfaces / contracts:
  - `node scripts/runtime-mode-canary.mjs`
  - `npm run ci:cloud-canary`
  - `npm run pack:smoke`
  - `npm run review`

## Architecture & Data
- Architecture / design adjustments:
  - Add minimal orchestration layer for repeated cloud canary scenarios and summary output.
  - No runtime provider contract/schema changes expected.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - Codex CLI with cloud access.

## Validation Plan
- Tests / checks:
  - `node scripts/delegation-guard.mjs --task 0990-js-repl-cloud-usage-evidence-gate`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` (paths touched include docs/skills/review-wrapper surfaces)
- Rollout verification:
  - Compare summary pass rates and explicit failed-lane details.
  - Ensure `js_repl` policy recommendation is evidence-backed.
- Monitoring / alerts:
  - Track fallback/error telemetry from manifests and command logs.

## Open Questions
- None.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-02.
