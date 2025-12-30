# PRD - Subagent Delegation Enforcement (0918-subagent-delegation-enforcement)

## Summary
- Problem Statement: Top-level agents still complete work solo, which increases context pressure, risks missed evidence, and undermines the repo's agent-first goal of management-focused coordination.
- Desired Outcome: Require top-level agents to delegate scoped work to subagents with manifest evidence, backed by a guardrail that enforces delegation and records any approved overrides.

## Goals
- Require at least one subagent run per top-level task, with manifests stored under `.runs/<task-id>-*/cli/<run-id>/manifest.json`.
- Standardize subagent task IDs as `<top-level-task-id>-<stream>` so evidence stays linked to the parent.
- Enforce delegation via a guard script that blocks review gates when no subagent evidence exists (override allowed only with explicit reason).
- Update AGENTS/SOPs/templates so delegation is a default, visible step in every workflow.

## Non-Goals
- Automatically spawning subagents or scheduling parallel runs.
- Enforcing delegation requirements for subagent runs themselves.
- Redesigning orchestrator pipelines beyond adding the delegation guard.
- Introducing new manifest schema fields (use existing evidence paths).

## Stakeholders
- Product: Agent orchestration program
- Engineering: Orchestrator maintainers
- Design: N/A (workflow policy)

## Metrics & Guardrails
- Primary Success Metrics:
  - 100% of top-level tasks have at least one subagent manifest path recorded in checklists.
  - `node scripts/delegation-guard.mjs` reports success for top-level task gates.
  - Overrides are rare and explicitly justified.
- Guardrails / Error Budgets:
  - Top-level runs must export `MCP_RUNNER_TASK_ID` and appear in `tasks/index.json`.
  - Subagent runs must use `<task-id>-<stream>` naming to satisfy guard checks.
  - Overrides require `DELEGATION_GUARD_OVERRIDE_REASON` and checklist evidence.

## User Experience
- Personas:
  - Top-level orchestrator coordinating multi-step requests.
  - Subagents handling scoped investigation, validation, or specialized skills.
- User Journeys:
  - Top-level agent spawns a subagent run (`MCP_RUNNER_TASK_ID=0918-subagent-delegation-enforcement-research`) and captures its manifest path.
  - Delegation guard passes before docs-review/implementation gates.
  - Task checklists show subagent evidence and any overrides (if used).

## Technical Considerations
- Delegation guard reads `tasks/index.json` to identify top-level tasks and check `.runs/<task-id>-*/cli/<run-id>/manifest.json` evidence.
- Guard skips enforcement for subagent task IDs that start with a known top-level task ID plus `-`.
- Update pipelines and agent docs to include the delegation guard before review handoff.

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-subagent-delegation-enforcement.md`
- Action Plan: `docs/ACTION_PLAN-subagent-delegation-enforcement.md`
- Task checklist: `tasks/tasks-0918-subagent-delegation-enforcement.md`

## Decisions
- Subagent task IDs must be prefixed with the top-level task ID.
- Delegation guard blocks gates unless an override reason is supplied.

## Open Questions
- Should we require more than one subagent for multi-track tasks, or only one minimum?

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
