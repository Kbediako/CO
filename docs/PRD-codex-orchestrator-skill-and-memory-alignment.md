# PRD - Codex-Orchestrator Skill + Feature Canonical Alignment (0991)

## Summary
- Problem Statement: CO currently lacks a dedicated bundled `codex-orchestrator` entrypoint skill that routes users to the right downstream skills, and docs/guidance still contain drift in feature naming (`memory_tool` vs canonical `memories`) plus stale Codex stable-version references.
- Desired Outcome: ship a minimal, high-leverage guidance update that introduces a dedicated bundled `codex-orchestrator` skill, aligns canonical feature naming and policy wording across repo guidance, and refreshes version references to current stable policy.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): confirm whether a codex-orchestrator usage skill exists; if missing, decide deeply whether it should be shipped and what it should include; keep docs globally aligned and relevant.
- Success criteria / acceptance:
  - A bundled `codex-orchestrator` skill exists with clear usage routing and links to related skills.
  - Canonical feature naming for memory is aligned to `memories` in policy/guidance surfaces (while acknowledging legacy alias compatibility when needed).
  - Version-policy references are up to date for current stable posture.
  - Checklist mirrors, `tasks/index.json`, and `docs/TASKS.md` remain synchronized with evidence.
- Constraints / non-goals:
  - Docs-first before implementation edits.
  - Minimal, high-leverage deltas only.
  - No unrelated refactors or behavior changes.

## Goals
- Add a bundled `skills/codex-orchestrator/SKILL.md` as the primary usage router for CO workflows.
- Align AGENTS/README/guides wording to canonical `memories` terminology and current feature posture.
- Refresh Codex version policy references to current stable baseline and preserve explicit prerelease-gating semantics.

## Non-Goals
- Runtime architecture changes.
- New orchestration pipelines or command-surface expansion.
- Enabling memory beyond current explicit eval-lane posture.

## Metrics & Guardrails
- Primary success metric: `docs:check` + `docs:freshness` + `pack:smoke` pass with consistent guidance language and installed skill packaging intact.
- Guardrails:
  - Keep `executionMode`/`runtimeMode` semantics unchanged.
  - Keep `js_repl` default-on posture unchanged.
  - Keep memory usage scoped and non-promotional (eval-lane framing only).

## Approvals
- Product: User-approved follow-up scope on 2026-03-03.
- Engineering: Pending implementation + validation.
- Design: N/A.
