---
id: 20260303-0992-release-0-1-38-skills-docs-alignment
title: CO 0.1.38 Release + Skills/Docs Alignment
relates_to: docs/PRD-release-0-1-38-skills-docs-alignment.md
risk: high
owners:
  - Codex
last_review: 2026-03-03
---

## Summary
- Objective: complete a release-grade docs/skills coherence audit, apply minimal fixes, evaluate the new forked-session/subagent-context capability, and publish `0.1.38` with full evidence.
- Scope: docs-first scaffolding, delegated audit streams, focused doc/skill updates (only where contradictions exist), release lifecycle, and global skill-install verification.
- Constraints: keep operational semantics stable; avoid unrelated changes.

## Technical Requirements
- Functional requirements:
  - Create task-scoped docs-first artifacts and checklist mirrors.
  - Run bounded audit streams for:
    - docs/SOP contradiction detection,
    - bundled skills coherence checks,
    - release readiness preflight,
    - fork-context capability assessment (`codex fork` and collab `spawn_agent` with `fork_context`).
  - Resolve validated contradictions/staleness with minimal edits.
  - Produce an explicit decision note for fork-context adoption:
    - guidance-only in skills/docs, or
    - programmatic CO behavior/telemetry updates.
  - If guidance-only is selected, document recommended usage lanes and guardrails.
  - If programmatic is selected, implement only minimal required behavior with tests.
  - Run ordered quality gates 1-10 and store logs under `out/0992-release-0-1-38-skills-docs-alignment/manual/`.
  - Bump version to `0.1.38`, open/merge release PR, create signed tag, push tag, and verify release workflow + npm publish.
  - Install `codex-orchestrator` skill globally and verify installed path.
- Non-functional requirements:
  - Non-destructive git workflow.
  - High auditability via manifest/log evidence.
  - Keep docs and task mirrors synchronized.
- Interfaces / contracts:
  - `codex-orchestrator start ...` pipelines and manifest outputs.
  - GitHub PR/release flows (`gh` CLI + Actions workflow).
  - npm package publication and global skill installation command surface.

## Architecture & Data
- Architecture / design adjustments:
  - Fork-context policy remains guidance-first (`fork_context=false` default, explicit exceptions only).
  - Minimal programmatic scope approved: additive fork-context observability in collab manifest entries plus `doctor --usage` counters.
- Data model changes / migrations:
  - Add optional `collab_tool_calls[].fork_context` (`boolean|null`) in manifest schema/types (non-breaking additive field).
- External dependencies / integrations:
  - GitHub Actions release workflow.
  - npm registry publication.
  - Codex home skill installation (`~/.codex/skills`).

## Validation Plan
- Tests / checks:
  - `node scripts/delegation-guard.mjs --task 0992-release-0-1-38-skills-docs-alignment`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Release verification:
  - Signed tag verification (`git tag -v`).
  - Release workflow terminal pass.
  - npm version/readback + downstream smoke.
  - Global skill install verification.
  - Fork-context decision + rationale recorded in task evidence notes.
- Monitoring / alerts:
  - Track PR checks and review state until merge-ready.

## Open Questions
- None.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-03.
