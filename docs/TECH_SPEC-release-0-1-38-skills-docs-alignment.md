# TECH_SPEC - CO 0.1.38 Release + Skills/Docs Alignment

- Canonical TECH_SPEC: `tasks/specs/0992-release-0-1-38-skills-docs-alignment.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-03.

## Summary
- Run deep release-grade audits across shipped skills and core docs/SOPs, evaluate fork-context capability usage (`codex fork` / collab `fork_context`), fix only validated contradictions, then publish `0.1.38` with signed-tag + manifest/log evidence.
- Fork-context technical stance: guidance-first default, plus additive observability capture (`spawn_agent.fork_context` in collab manifest entries and `doctor --usage` counters) with zero behavioral change.

## Requirements
- Complete docs-first artifacts + checklist mirrors before implementation edits.
- Capture delegated/bounded audit evidence and docs-review manifest before implementation.
- Keep runtime/execution mode semantics unchanged.
- Record an explicit fork-context adoption decision (guidance-only vs programmatic), with rationale and usage guidance.
- If programmatic support is selected, keep scope to observability-only fields/counters (no default behavior changes, no orchestration policy automation).
- Complete ordered validation gates (1-10), then execute release lifecycle and verify npm/global-skill outcomes.

## Acceptance
- No unresolved high-severity contradiction remains in core docs/skills guidance.
- Validation gates and release publish checks pass.
- `codex-orchestrator` skill is confirmed installed globally.
- Fork-context evidence is auditable from manifests/doctor output without changing collab execution semantics.

## Evidence & Artifacts
- Checklists:
  - `tasks/tasks-0992-release-0-1-38-skills-docs-alignment.md`
  - `.agent/task/0992-release-0-1-38-skills-docs-alignment.md`
  - `docs/TASKS.md`
  - `tasks/index.json`
- Validation logs:
  - `out/0992-release-0-1-38-skills-docs-alignment/manual/`
