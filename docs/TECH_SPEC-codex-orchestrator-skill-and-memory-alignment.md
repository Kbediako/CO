# TECH_SPEC - Codex-Orchestrator Skill + Feature Canonical Alignment

- Canonical TECH_SPEC: `tasks/specs/0991-codex-orchestrator-skill-and-memory-alignment.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-03.

## Summary
- Add a dedicated bundled `codex-orchestrator` usage skill and align feature/version guidance to current canonical posture (`memories`, stable `0.107.0`) without changing runtime behavior.

## Requirements
- Ship bundled `skills/codex-orchestrator/SKILL.md` with explicit workflow routing and related-skill links.
- Align policy/guidance wording from `memory_tool` to canonical `memories` in AGENTS/README/guides surfaces.
- Keep compatibility notes for legacy alias usage when relevant.
- Refresh version-policy references to current stable baseline.
- Keep task/spec/checklist mirrors synchronized.

## Acceptance
- `docs:check`, `docs:freshness`, and `pack:smoke` pass.
- Delegation evidence exists for task-scoped stream(s).
- No runtime/provider contract changes.

## Evidence & Artifacts
- Checklists:
  - `tasks/tasks-0991-codex-orchestrator-skill-and-memory-alignment.md`
  - `.agent/task/0991-codex-orchestrator-skill-and-memory-alignment.md`
  - `docs/TASKS.md`
  - `tasks/index.json`
- Validation logs:
  - `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/`
