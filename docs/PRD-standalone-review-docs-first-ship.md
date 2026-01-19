# PRD — Standalone Review + Docs-First Shipping (0953)

## Summary
- Problem Statement: Standalone review guidance and the docs-first workflow need to be shipped with clear, consistent instructions. Current wording around mini-specs, delegation vs codex exec, and MCP selection can be confusing for downstream users.
- Desired Outcome: Ship updated guidance, templates, and skills that enforce PRD + TECH_SPEC + ACTION_PLAN + task checklists for every task, clarify delegation/codex exec usage, and remove mini-spec terminology.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Ship recent work on standalone reviews and docs-first (spec-driven) workflow, clean up terminology and contradictions, and ensure future agents follow the docs-first + delegation-first rules.
- Success criteria / acceptance: Updated AGENTS + SOPs + skills + templates; PRD/TECH_SPEC/ACTION_PLAN + tasks are required; mini-spec terminology removed from guidance; delegation always enabled by default; codex exec reserved for pre-task triage; MCP selection is “use what’s available and relevant”; approvals and checklists updated with evidence.
- Constraints / non-goals: Keep scope doc-only; avoid unrelated refactors; align with the existing release version bump.

## Goals
- Ship standalone review guidance for pre-implementation approvals and ad-hoc checks.
- Enforce PRD + TECH_SPEC + ACTION_PLAN + task checklists for all tasks (depth scales with scope).
- Remove mini-spec terminology from core guidance and templates while acknowledging legacy references.
- Clarify delegation vs codex exec usage and MCP selection rules.

## Non-Goals
- Large-scale retroactive edits to historical PRDs/action plans.
- Changes to core orchestrator code or pipeline execution.

## Stakeholders
- Product: Repository maintainers.
- Engineering: Codex agents and downstream users.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics: Docs-first guidance is consistent across AGENTS/SOPs/skills/templates; required artifacts exist for task 0953.
- Guardrails / Error Budgets: No new pipeline failures; avoid introducing contradictory guidance.

## User Experience
- Personas: Repo maintainers and downstream agent users.
- User Journeys: Create PRD/TECH_SPEC/ACTION_PLAN + tasks, run standalone review before edits, delegate subagent with manifest evidence, and ship updates with clear instructions.

## Technical Considerations
- Architectural Notes: Documentation-only changes; use existing pipeline guardrails.
- Dependencies / Integrations: Codex CLI, delegation MCP server, docs-freshness registry updates.

## Open Questions
- None.

## Approvals
- Product:
- Engineering:
- Design:
