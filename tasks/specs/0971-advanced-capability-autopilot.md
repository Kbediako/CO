---
id: 20260217-0971-advanced-capability-autopilot
title: Advanced Capability Autopilot + Usage Signal Hardening
relates_to: tasks/tasks-0971-advanced-capability-autopilot.md
risk: medium
owners:
  - Codex
last_review: 2026-02-18
---

## Summary
- Objective: implement the 5-point advanced capability usage upgrade with additive, low-friction defaults.
- Scope: advanced-mode auto routing semantics, bounded scout injection, structured cloud fallback reason, large-context-only RLM auto gating, and KPI surfacing in doctor usage + run summary.
- Follow-up scope (2026-02-18): add collab lifecycle leak diagnostics to `doctor --usage` and strengthen shipped close-sweep guidance for spawned-agent lifecycle recovery.
- Constraints: preserve explicit overrides and maintain backward compatibility where practical.

## Technical Requirements
- Functional requirements:
  - `advanced-mode=auto` must expose deterministic routing status/reason.
  - Non-trivial pipelines must run bounded non-blocking scout evidence collection.
  - Cloud preflight fallback reason must be structured and emitted in run output.
  - RLM auto symbolic activation must require true large-context signals.
  - Usage KPIs must be visible in human-readable and JSON-compatible outputs.
  - Collab lifecycle diagnostics must expose likely unclosed spawned-agent counts and likely failed spawn/thread-limit indicators.
  - Shipped collab/delegation skills must define deterministic close-sweep behavior for thread-limit recovery.
- Non-functional requirements:
  - No broad architectural refactor.
  - Keep latency impact bounded for default runs.
- Interfaces / contracts:
  - CLI remains backward-compatible; new fields are additive.

## Validation Plan
- Tests / checks: delegation/spec guard, build, lint, test, docs checks, diff-budget, review.
- Regression checks:
  - auto scout does not block main pipeline when scout fails/timeouts.
  - cloud fallback reason appears in structured output and summary.
  - RLM auto does not switch symbolic on small contexts.
  - KPI output remains parseable and deterministic.
  - Collab lifecycle diagnostic counters are additive and do not break existing usage output parsing.
  - Summary output surfaces lifecycle leak/thread-limit hints with stable wording.

## Open Questions
- None blocking.

## Approvals
- Reviewer: user
- Date: 2026-02-18
