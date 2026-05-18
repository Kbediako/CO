---
id: 20260217-0971-advanced-capability-autopilot
title: Advanced Capability Autopilot + Usage Signal Hardening
status: done
relates_to: tasks/tasks-0971-advanced-capability-autopilot.md
risk: medium
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (17 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
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
  - Collab lifecycle diagnostic counters are additive and do not break existing usage output parsing (`out/0971-advanced-capability-autopilot/manual/follow-up-validation-20260218-201823.log`).
  - Summary output surfaces lifecycle leak/thread-limit hints with stable wording (`out/0971-advanced-capability-autopilot/manual/follow-up-validation-20260218-201823.log`).

## Open Questions
- None blocking.

## Review Notes
- 2026-04-21: CO-278 spec-guard freshness review re-read the summary, requirements, and validation plan; no scope reclassification or archive action is warranted, so this refresh is limited to the stale review baseline blocking enforced `node scripts/spec-guard.mjs`.

## Approvals
- Reviewer: user
- Date: 2026-02-18
