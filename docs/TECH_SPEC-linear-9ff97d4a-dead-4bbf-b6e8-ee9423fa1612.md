---
id: 20260330-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612
title: CO Preserve Scoped Standalone-Review Context Without Inline Prompt
relates_to: docs/PRD-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md
risk: high
owners:
  - Codex
last_review: 2026-03-30
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`
- PRD: `docs/PRD-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`
- Task checklist: `tasks/tasks-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md`

## Traceability
- Linear issue: `CO-43` / `9ff97d4a-dead-4bbf-b6e8-ee9423fa1612`
- Linear URL: https://linear.app/asabeko/issue/CO-43/co-preserve-scoped-standalone-review-context-without-inline-prompt

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: preserve bounded reviewer-visible task context for explicit scoped standalone-review launches without reintroducing prompt-plus-scope incompatibility.
- Scope:
  - docs-first registration and baseline audit for the current Linear worker issue
  - bounded scoped-context transport changes in `scripts/run-review.ts`, `scripts/lib/review-launch-attempt.ts`, `scripts/lib/review-prompt-context.ts`, and `scripts/lib/review-execution-telemetry.ts`
  - focused wrapper regressions in `tests/review-launch-attempt.spec.ts` and `tests/run-review.spec.ts`
  - bounded docs updates in standalone-review guidance surfaces
- Constraints:
  - explicit scope must remain exact and auditable
  - full prompt/context must stay in `review/prompt.txt`
  - live scoped review must not rely on inline prompt delivery

## Technical Requirements
- Functional requirements:
  - explicit `--base`, `--commit`, and `--uncommitted` review runs must still launch without inline prompt arguments
  - when explicit scoped review lacks a user-provided `--title`, the wrapper must synthesize a bounded reviewer-visible title from resolved `NOTES` plus the requested review surface
  - if Codex rejects a synthesized scoped `--title`, the wrapper must retry the same explicit scope without `--title` and surface artifact-only reviewer-visible context truthfully instead of failing the scope outright
  - when a user already supplied `--title`, scoped review must keep that explicit title rather than silently replacing it
  - persisted telemetry and docs must state whether the live reviewer received inline prompt context, bounded title context, or artifact-only context
  - explicit scoped review must continue failing fast for non-`diff` surfaces
- Non-functional requirements (performance, reliability, security):
  - keep the patch narrow to the scoped launch/context transport seam
  - keep telemetry and docs truthful about context delivery
  - avoid new compatibility regressions for scope flags or existing explicit `--title` handling
- Interfaces / contracts:
  - prompt/context assembly: `scripts/run-review.ts`, `scripts/lib/review-prompt-context.ts`
  - scoped launch builder: `scripts/lib/review-launch-attempt.ts`
  - telemetry payload: `scripts/lib/review-execution-telemetry.ts`
  - operator docs: `docs/standalone-review-guide.md`, `skills/standalone-review/SKILL.md`, `AGENTS.md`, `docs/AGENTS.md`

## Architecture & Data
- Architecture / design adjustments:
  - separate full prompt persistence from the bounded scoped reviewer-visible context transport
  - derive the scoped reviewer-visible title from resolved `NOTES` + surface when needed
  - make telemetry launch context report the reviewer-visible transport explicitly enough to catch silent regressions
- Data model changes / migrations:
  - extend `launch_context` with bounded context-transport metadata for scoped review
- External dependencies / integrations:
  - current Codex CLI support for `--title` alongside `--commit`, `--base`, and `--uncommitted`
  - existing pack-smoke and wrapper telemetry expectations

## Validation Plan
- Tests / checks:
  - docs-review before implementation
  - focused regressions in `tests/review-launch-attempt.spec.ts` and `tests/run-review.spec.ts`
  - required repo validation floor after implementation
- Rollout verification:
  - confirm scoped launch args keep scope flags and omit inline prompt content
  - confirm scoped launch adds bounded reviewer-visible title context when no explicit title was provided
  - confirm telemetry/docs stay aligned with the shipped scoped-context contract
- Monitoring / alerts:
  - use the Linear workpad for operator-visible progress
  - use saved review telemetry plus wrapper tests as the primary context-transport evidence surface

## Open Questions
- None. The live title probe reduced the design to the bounded title-plus-artifact path, with a same-scope artifact-only fallback when synthesized scoped `--title` transport is unsupported.

## Approvals
- Reviewer: `codex-orchestrator docs-review`
- Date: 2026-03-30
- Evidence: `.runs/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612-docs-review/cli/2026-03-30T06-52-40-070Z-7b90108a/manifest.json`, `out/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612/manual/20260330T070418Z-docs-review-fallback.md`

## Manifest Evidence
- Baseline audit: `out/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612/manual/20260330T064502Z-baseline-audit.md`
- Docs-review approval: `.runs/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612-docs-review/cli/2026-03-30T06-52-40-070Z-7b90108a/manifest.json`
- Docs-review fallback note: `out/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612/manual/20260330T070418Z-docs-review-fallback.md`
