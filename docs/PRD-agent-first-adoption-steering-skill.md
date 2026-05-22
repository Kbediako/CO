# PRD - Agent-First Adoption Steering Skill (0978)

## Summary
- Problem Statement: Existing adoption nudges for advanced CO capabilities (cloud, RLM/collab, delegation evidence) are useful but can drift into noisy or repetitive behavior in high-throughput agent workflows.
- Desired Outcome: ship a bundled skill that steers advanced feature usage with non-coercive, autonomy-preserving guidance using event/run-aware controls.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): deliberate on run-only vs time-only vs mixed controls, prioritize agent autonomy, then draft a downstream-shippable skill and validate it with tailored standalone/elegance reviews.
- Success criteria / acceptance:
  - Skill explicitly recommends non-coercive guidance (optional, non-blocking wording).
  - Control policy is finalized with clear rationale for agent-first/high-frequency runs.
  - Docs-first artifacts and task mirrors are complete and registered.
  - Tailored standalone and elegance reviews are captured after drafting.
- Constraints / non-goals:
  - Do not force mode changes (no mandatory cloud/RLM/delegation actions).
  - Do not reduce MCP-first default posture.
  - Keep changes guidance-layer only (docs + skill), no runtime behavior changes in this task.

## Goals
- Finalize a durable control policy for nudges under high run throughput.
- Package policy as a reusable bundled skill for downstream users.
- Keep guidance lightweight and autonomy-first across heterogeneous downstream repos.

## Non-Goals
- Implementing new CLI/runtime nudge engines in this task.
- Introducing mandatory gates tied to capability adoption.
- Repo-specific tuning per downstream project.

## Stakeholders
- Product: CO maintainer.
- Engineering: CO maintainers and downstream agents.
- Design: CLI/skill guidance maintainers.

## Metrics & Guardrails
- Primary Success Metrics:
  - Skill guidance is actionable and unambiguous for autonomy-safe adoption behavior.
  - Review passes identify no coercive wording or heavy-handed defaults.
- Guardrails / Error Budgets:
  - Max one recommendation surfaced per guidance moment.
  - Explicit optional language and ignore-safe behavior.
  - Guidance remains compatible with repos lacking cloud wiring.

## User Experience
- Personas:
  - Top-level agents managing high-frequency orchestrator loops.
  - Downstream users with mixed cloud/collab readiness.
- User Journeys:
  - Agent reads skill and selects a capability nudge only when context supports it.
  - Agent can skip recommendation with no execution penalty.
  - Skill gives clear fallback when readiness signals are missing.

## Technical Considerations
- Architectural Notes:
  - Guidance-only change under `skills/` and associated docs/task registries.
  - Policy uses hybrid controls (event/run first, time second) rather than pure day-based throttling.
- Dependencies / Integrations:
  - Bundled skills packaging (`skills/**`) and release docs.
  - Existing docs-first/task registry conventions.

## Decision: Run-Only vs Time-Only vs Hybrid
- Decision: adopt a hybrid policy (event/run-based primary controls with time-based safety caps).
- Why not run-only:
  - Low-volume repos can become stale if controls are solely run-count-based.
  - Long idle windows need bounded re-introduction logic.
- Why not time-only:
  - High-throughput agent loops can trigger repetitive nudges despite short wall-clock intervals.
- Hybrid policy target:
  - Event transitions trigger eligibility.
  - Run-count budgets govern repetition in fast loops.
  - Time caps provide stale-state refresh and low-volume fallback.

## Open Questions
- None blocking.

## Approvals
- Product: user
- Engineering: user
- Design: user
