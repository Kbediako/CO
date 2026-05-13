# TECH_SPEC - CO Codex Alpha Agent-First Policy

- Canonical TECH_SPEC: `tasks/specs/0986-co-codex-alpha-agent-first-policy.md`.
- Owner: Codex.
- Last Reviewed: 2026-02-27.

## Summary
- Add minimal, explicit, agent-visible policy documentation for CO-only Codex alpha usage and update cadence.

## Requirements
- Add policy section to `AGENTS.md` (global handbook used by agents in this repo).
- Add mirrored policy section to `docs/AGENTS.md`.
- Add canonical guide: `docs/guides/codex-version-policy.md`.
- Define these policy semantics:
  - global default remains stable unless explicitly promoted by evidence
  - CO can run alpha in task-scoped lanes
  - required evidence gates and rollback behavior
  - cadence expectations (new alpha candidate + weekly backstop)

## Acceptance
- Policy is discoverable in both handbook files.
- Guide includes commands/evidence paths and fallback behavior.
- Task mirrors/index updated with this policy task.

## Evidence & Artifacts
- Checklists:
  - `tasks/tasks-0986-co-codex-alpha-agent-first-policy.md`
  - `.agent/task/0986-co-codex-alpha-agent-first-policy.md`
  - `docs/TASKS.md`
  - `tasks/index.json`
- Validation logs: `out/0986-co-codex-alpha-agent-first-policy/manual/`.
