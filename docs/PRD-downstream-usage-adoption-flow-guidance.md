# PRD - Downstream Usage Adoption + Guardrail Flow + Setup Guidance (0968)

## Summary
- Problem Statement: Downstream repos are often using `codex-orchestrator` mostly as plain `exec` and under-using higher-leverage capabilities (docs-review, implementation-gate, delegation, cloud). Current UX requires users/agents to remember multiple steps and discover guidance manually.
- Desired Outcome: add low-friction CLI steering so downstream usage naturally shifts toward guardrail pipelines and policy-aligned setup without editing each downstream repo.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): improve global/shipped orchestrator behavior so repos like `tower-defence` adopt collab/cloud/delegation/guardrail flows more often without per-repo custom changes.
- Success criteria / acceptance:
  - `exec` users receive concise, context-aware nudges toward guardrail usage when adoption signals are low.
  - A single low-friction command can run docs-first guardrail flow (docs-review then implementation-gate).
  - `setup` output explicitly points users/agents to policy + skills guidance so behavior is standardized downstream.

## Goals
- Increase usage of `docs-review` and `implementation-gate` in downstream repos.
- Reduce memory burden by shipping a guided workflow command for common docs->implementation flow.
- Improve setup discoverability for agent-first policy/skills guidance.

## Non-Goals
- Forcing hard failure when users choose plain `exec`.
- Reworking pipeline definitions or adding new heavy framework dependencies.
- Repo-specific tuning inside downstream repositories.

## Stakeholders
- Product: CO maintainer (agent-first downstream outcomes).
- Engineering: codex-orchestrator maintainers and downstream agents.
- Design: CLI UX/help surface maintainers.

## Metrics & Guardrails
- Primary Success Metrics:
  - Higher share of gate runs (`docs-review`, `implementation-gate`) vs raw exec in `doctor --usage` reports.
  - Reduced manual setup confusion in downstream repos.
- Guardrails / Error Budgets:
  - No regressions to existing command compatibility.
  - New guidance remains non-blocking and concise.

## User Experience
- Personas: top-level agents and maintainers running orchestrator in varied downstream repos.
- User Journeys:
  - After `exec`, user sees brief recommendation when local usage pattern suggests under-adoption.
  - User runs one command for docs->implementation guardrail flow.
  - During `setup`, user sees canonical policy/skills guidance references.

## Technical Considerations
- Architectural Notes:
  - Reuse existing `doctorUsage` logic for recommendations.
  - Reuse existing orchestrator run plumbing (`withRunUi`, `emitRunOutput`) for the new flow command.
  - Extend setup summary payload only; keep install behavior unchanged.
- Dependencies / Integrations:
  - No new runtime dependencies expected.
  - Must remain compatible with text and JSON output modes.

## Open Questions
- None blocking for the first minimal patch.

## Approvals
- Product: user
- Engineering: user
- Design: user
