---
id: 20260330-linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d
title: CO Fix Standalone Review Wrapper Commit Base-Scoped Codex Review Launch
relates_to: docs/PRD-linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md
risk: high
owners:
  - Codex
last_review: 2026-03-30
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`
- PRD: `docs/PRD-linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`
- Task checklist: `tasks/tasks-linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d.md`

## Traceability
- Linear issue: `CO-39` / `ea3ee445-72d1-4c3d-90cc-1673c714eb2d`
- Linear URL: https://linear.app/asabeko/issue/CO-39/co-fix-standalone-review-wrapper-commitbase-scoped-codex-review-launch

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make explicit commit/base standalone-review launches execute truthfully by removing unsupported prompt delivery from scoped Codex review calls while keeping wrapper-side evidence intact.
- Scope:
  - docs-first registration and baseline audit for the current Linear worker issue
  - bounded wrapper launch changes in `scripts/lib/review-launch-attempt.ts` and any direct telemetry/help seam needed to describe scoped launch truthfully
  - focused wrapper regressions in `tests/review-launch-attempt.spec.ts` and `tests/run-review.spec.ts`
  - bounded doc updates in the standalone-review guidance surfaces
- Constraints:
  - never silently drop explicit scope flags
  - preserve prompt/context artifacts even when the prompt cannot be passed inline for scoped review
  - stay out of unrelated review-policy or provider-worker workflow changes

## Technical Requirements
- Functional requirements:
  - explicit `--commit` review runs must omit the prompt argument passed to `codex review`
  - explicit `--base` review runs must omit the prompt argument passed to `codex review`
  - wrapper help/docs must explain that explicit scoped runs keep prompt/context as wrapper-side evidence rather than inline Codex prompt payload
  - persisted evidence must expose that scoped launch difference truthfully
- Non-functional requirements (performance, reliability, security):
  - keep the patch narrow to the launch seam and direct evidence/docs consumers
  - maintain auditability through saved artifacts and focused tests
  - avoid silent fallback from scoped to unscoped review
- Interfaces / contracts:
  - launch builder: `scripts/lib/review-launch-attempt.ts`
  - wrapper shell/help: `scripts/run-review.ts`
  - telemetry persistence: `scripts/lib/review-execution-telemetry.ts`
  - operator docs: `docs/standalone-review-guide.md`, `skills/standalone-review/SKILL.md`, `AGENTS.md`, `docs/AGENTS.md`

## Architecture & Data
- Architecture / design adjustments:
  - keep prompt artifact generation unchanged
  - split prompt delivery from prompt artifact persistence for explicit scoped launches
  - make scoped launch truth explicit in wrapper output/docs and, if needed, telemetry payload
- Data model changes / migrations:
  - none expected outside bounded review telemetry metadata
- External dependencies / integrations:
  - current Codex CLI compatibility behavior for prompt-plus-scope rejection
  - existing review telemetry and pack-smoke artifact expectations

## Validation Plan
- Tests / checks:
  - docs-review before implementation
  - focused regressions in `tests/review-launch-attempt.spec.ts` and `tests/run-review.spec.ts`
  - required repo validation floor after implementation
- Rollout verification:
  - confirm scoped launch args no longer include the prompt payload
  - confirm scoped prompt artifacts still render path-only scope notes and evidence context
  - confirm wrapper docs/help match shipped behavior
- Monitoring / alerts:
  - use the Linear workpad for operator-visible progress
  - use saved review artifacts and focused tests as the primary evidence surface

## Open Questions
- Whether the smallest truthful evidence change is one explicit telemetry field or a help/output/docs clarification only.

## Approvals
- Reviewer: docs-review approved via `.runs/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d-docs-review/cli/2026-03-30T00-48-51-127Z-e10216d7/manifest.json`
- Date: 2026-03-30

## Manifest Evidence
- Baseline audit: `out/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d/manual/20260330T004235Z-baseline-audit.md`
- Docs-review manifest: `.runs/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d-docs-review/cli/2026-03-30T00-48-51-127Z-e10216d7/manifest.json`
