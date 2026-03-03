---
id: 20260303-0991-codex-orchestrator-skill-and-memory-alignment
title: Codex-Orchestrator Skill + Feature Canonical Alignment
relates_to: docs/PRD-codex-orchestrator-skill-and-memory-alignment.md
risk: medium
owners:
  - Codex
last_review: 2026-03-03
---

## Summary
- Objective: add a dedicated bundled `codex-orchestrator` usage skill and align repo guidance to canonical feature naming/version posture with minimal scope.
- Scope: docs-first scaffolding, delegated research/review stream, focused skill/docs/test updates, and checklist/index mirror synchronization.
- Constraints: no behavioral/runtime changes; preserve current compatibility posture.

## Technical Requirements
- Functional requirements:
  - Add `skills/codex-orchestrator/SKILL.md` that maps common intents to orchestrator command paths and related skills.
  - Update policy/guidance references from `memory_tool` to canonical `memories` where it is feature-name guidance.
  - Preserve explicit note that legacy alias compatibility exists upstream where relevant.
  - Refresh Codex version policy references to current stable baseline (`0.107.0`) and maintain prerelease evidence gates.
  - Sync `tasks/`, `.agent/task/`, `docs/TASKS.md`, and `tasks/index.json`.
- Non-functional requirements (performance, reliability, security):
  - No runtime behavior changes.
  - Minimal diff and high readability.
  - Preserve non-destructive workflow and auditability.
- Interfaces / contracts:
  - Skill packaging path consumed by `codex-orchestrator skills install`.
  - Existing docs/AGENTS policy surfaces.
  - Cloud feature flag pass-through contract (`CODEX_CLOUD_ENABLE_FEATURES` / `CODEX_CLOUD_DISABLE_FEATURES`).

## Architecture & Data
- Architecture / design adjustments:
  - Add one bundled skill entrypoint (`codex-orchestrator`) as router-level guidance.
  - No pipeline or runtime contract changes.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - Codex CLI feature naming (`memories`, `js_repl`) and CO docs policy.

## Validation Plan
- Tests / checks:
  - `node scripts/delegation-guard.mjs --task 0991-codex-orchestrator-skill-and-memory-alignment`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollout verification:
  - Confirm `skills/codex-orchestrator/SKILL.md` is included in packaged skill install path.
  - Confirm no stale `memory_tool` policy wording remains in targeted guidance surfaces.
- Monitoring / alerts:
  - N/A (docs/skill-only change).

## Open Questions
- None.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-03.
