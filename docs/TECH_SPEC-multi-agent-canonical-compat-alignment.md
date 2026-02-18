# TECH_SPEC - Multi-Agent Canonical Terminology + Compatibility Alignment (0972)

- Objective: Align CO docs/help wording to canonical `multi_agent` while retaining compatibility-safe legacy contracts.
- Scope: wording + policy updates, targeted doctor/help copy adjustments, and regression validation.
- Canonical TECH_SPEC: `tasks/specs/0972-multi-agent-canonical-compat-alignment.md`.

## Requirements
- Canonical-first enablement language (`features.multi_agent=true`) across user-facing docs/help.
- Explicit compatibility notes for legacy alias surfaces (`collab`, `RLM_SYMBOLIC_COLLAB`, `manifest.collab_tool_calls`).
- No breaking interface/schema renames in this phase.

## Validation
- `npm run test -- orchestrator/tests/Doctor.test.ts orchestrator/tests/RlmRunnerMode.test.ts`
- `npm run docs:check`
- `npm run lint`
- `npm run build`

## Approvals
- User approved direction on 2026-02-18.
