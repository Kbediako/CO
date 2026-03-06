# PRD - Task Index Canonicalization + Registry Normalization (1006)

## Summary
- Problem: `tasks/index.json` currently carries split-state (`items[]` plus legacy `tasks[]`), which risks registry drift and contradictory task visibility in tooling.
- Outcome target: establish one canonical top-level registry (`items[]`) and retire legacy split-state safely.
- Scope status: docs-first lane complete (planning + evidence gate) on 2026-03-05.

## User Request Translation
- Start optional slice `1006-task-index-canonicalization-and-registry-normalization` with full docs-first package.
- Capture manifest-backed docs-review evidence before implementation stream begins.
- Keep this slice bounded to registry canonicalization and reference alignment.

## Explicit Scope
- Canonicalize `tasks/index.json` to one canonical top-level registry (`items[]`).
- Remove/retire legacy split-state (`tasks[]`) safely.
- Align docs/tooling references impacted by canonicalization.
- No unrelated refactors.

## Goals
- Define safe migration plan from split-state to canonical `items[]`.
- Keep delegation/spec/docs guardrails intact during migration.
- Produce implementation-ready constraints and exact expected touch points.

## Non-Goals
- No scheduler/control-plane behavior changes.
- No broad docs rewrites beyond scope-driven alignment.
- No unrelated code cleanup.

## Acceptance Criteria
1. PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are created and synchronized for `1006`.
2. `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` include `1006` registration.
3. Docs-review manifest is captured for `1006` before implementation begins.
4. Docs checks (`docs:check`, `docs:freshness`), standalone review checkpoint, and elegance note are captured with evidence paths.
5. A short implementation handoff note exists with accepted constraints and exact expected file-change scope.
