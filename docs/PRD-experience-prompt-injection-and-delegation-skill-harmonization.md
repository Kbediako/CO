# PRD - Experience Prompt Injection + Delegation Skill Harmonization

## Summary
- Problem Statement: Experience records are persisted and filtered, but cloud execution prompts do not yet consume them directly; delegation guidance is split across `delegate-early` and `delegation-usage`, which adds operator friction.
- Desired Outcome: Make persisted experience snippets influence execution outcomes immediately and streamline shipped delegation skills so `delegation-usage` is the canonical path.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Improve practical effectiveness from the CO/Codex integration (not just telemetry), and reduce delegation workflow friction from overlapping skills.
- Success criteria / acceptance:
  - Cloud execution prompts include relevant high-signal experience snippets when available.
  - Behavior remains safe/minimal when no experiences exist.
  - Shipped skills/docs make `delegation-usage` the primary delegation workflow and clearly position `delegate-early` as compatibility guidance only.
  - Changes are included in shipped npm package contents.
- Constraints / non-goals:
  - Do not add a heavyweight memory system.
  - Do not break existing skill names used by downstream users.
  - Keep implementation minimal and auditable.

## Goals
- Increase direct outcome utility from persisted experience data.
- Improve operator ergonomics for delegation-first workflows.
- Keep release/shipped docs and skills aligned with actual runtime behavior.

## Non-Goals
- Building a new long-term memory backend.
- Reworking delegation server architecture in this iteration.
- Introducing broad prompt orchestration refactors.

## Stakeholders
- Product: CO operators using agent-first workflows.
- Engineering: Orchestrator runtime and skill maintainers.
- Design: N/A.

## Metrics and Guardrails
- Primary Success Metrics:
  - Cloud prompt payload includes selected experience snippets when prompt packs provide them.
  - Existing cloud flow remains green with no regressions.
  - Delegation skill docs reduce ambiguity (single canonical skill path).
- Guardrails / Error Budgets:
  - Prompt additions must be bounded and concise.
  - No regressions in build/lint/test/docs gates.

## User Experience
- Personas:
  - Agent operators running long-horizon tasks in cloud mode.
  - Downstream users installing bundled skills from npm.
- User Journeys:
  - Run cloud-mode pipeline -> prompt includes relevant prior experience hints -> higher-quality first-pass behavior.
  - Install skills from release -> follow one canonical delegation usage path.

## Technical Considerations
- Architectural Notes:
  - Reuse existing manifest prompt-pack experience snippets and domain metadata.
  - Inject selected snippets into cloud execution prompt builder.
  - Deprecate `delegate-early` guidance to point at `delegation-usage` while preserving compatibility file presence.
- Dependencies / Integrations:
  - Existing prompt-pack loader + experience store pipeline.
  - Bundled skills packaging under `skills/**` in npm artifact.

## Open Questions
- Should future iterations inject experience snippets into additional non-cloud prompt paths (for example RLM loops) as a separate follow-up?

## Evidence
- Pending implementation.

## Approvals
- Product: User approved implementation path
- Engineering: Codex (self)
- Design: N/A
