# PRD - Advanced Capability Autopilot + Usage Signal Hardening (0971)

## Summary
- Problem Statement: downstream runs (including tower-defence) still underuse advanced capability paths (collab/delegation/cloud/large-context RLM) because routing signals are either implicit, missing, or not surfaced clearly enough for automated agent decisions.
- Desired Outcome: make advanced behavior more automatic and observable with low-friction defaults, while preserving safety and backwards-compatible fallbacks.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): implement the approved 5-point plan end-to-end, deliberate deeply on each point and open questions, and optimize for least friction, autonomy, and accuracy for shipped/npm users.
- Success criteria / acceptance:
  - `advanced-mode=auto` behaves as context-aware autopilot rather than always-on advanced execution.
  - Non-trivial starts (`docs-review`, `implementation-gate`) run a bounded scout stage that captures evidence without blocking the main pipeline.
  - Cloud fallback uses structured manifest/output fields so users see why fallback happened without parsing free text.
  - RLM `auto` switches to symbolic only for true large-context inputs (with explicit context-source signal), reducing noisy symbolic activation.
  - Adoption KPIs are visible in `doctor --usage` and `run-summary` so usage gains and regressions are measurable.

## Goals
- Increase practical usage of advanced capabilities through stronger defaults and clearer routing feedback.
- Reduce hidden fallback behavior by making cloud downgrade reasons structured and visible.
- Keep implementation minimal and additive so downstream repos do not need migration work.

## Non-Goals
- No broad refactor of orchestration architecture.
- No breaking CLI surface changes for existing commands.
- No mandatory cloud setup requirement for repos that are local-only.

## Stakeholders
- Product: CO maintainer.
- Engineering: codex-orchestrator maintainers and downstream operators.
- Design/Docs: docs maintainers ensuring agent-first guidance stays aligned.

## Metrics & Guardrails
- Primary Success Metrics:
  - Increased percentage of runs that execute at least one advanced stream where appropriate.
  - `doctor --usage` exposes exec-vs-pipeline mix, delegation/collab/cloud usage, and adoption hints.
  - Fallback-to-mcp reason is structured and visible in run output.
- Guardrails / Error Budgets:
  - Preserve existing manual override paths (`--mode`, explicit cloud flags, strict profiles).
  - Keep new defaults bounded (timeouts/non-blocking scout, no forced symbolic on small contexts).

## User Experience
- Personas: agent-first operators running CO in CO repo and downstream repos.
- User Journeys:
  - Start a standard pipeline and receive automatic scout evidence plus clear fallback diagnostics.
  - Run usage diagnostics and quickly see where advanced capability usage is low/high.
  - Keep local workflows unblocked when cloud preflight fails.

## Technical Considerations
- Architectural Notes:
  - Targeted patches across orchestrator start flow, cloud preflight metadata, RLM mode resolution, doctor usage/reporting, and run-summary writing.
  - Additive manifest fields preferred over replacing existing summary text.
- Dependencies / Integrations:
  - Existing manifest schema/types, doctor usage aggregators, run-summary writer, pipeline experience instrumentation.

## Open Questions
- Deliberation decision: structured cloud fallback field should be additive (not replacing summary) for compatibility.
- Deliberation decision: auto scout remains advisory/non-blocking with explicit warning output on timeout/failure.
- Deliberation decision: RLM auto remains overrideable by explicit symbolic mode/env even after tighter large-context gating.

## Approvals
- Product: user
- Engineering: user
- Design: n/a
