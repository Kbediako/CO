---
id: 20260322-linear-856c1318-524f-4db3-8d4a-b357ec51c304
title: Archive Automation Policy Mismatch for Linked PRD TECH_SPEC and ACTION_PLAN Docs
relates_to: docs/PRD-linear-856c1318-524f-4db3-8d4a-b357ec51c304.md
risk: medium
owners:
  - Codex
last_review: 2026-03-23
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-856c1318-524f-4db3-8d4a-b357ec51c304.md`
- PRD: `docs/PRD-linear-856c1318-524f-4db3-8d4a-b357ec51c304.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-856c1318-524f-4db3-8d4a-b357ec51c304.md`
- Task checklist: `tasks/tasks-linear-856c1318-524f-4db3-8d4a-b357ec51c304.md`

## Traceability
- Linear issue: `CO-2` / `856c1318-524f-4db3-8d4a-b357ec51c304`
- Linear URL: https://linear.app/asabeko/issue/CO-2/archive-automation-policy-mismatch-for-linked-prdtech-specaction-plan

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Align implementation-docs archive behavior with the existing policy so linked `docs/PRD-*`, `docs/TECH_SPEC-*`, and `docs/ACTION_PLAN-*` docs archive when eligible.
- Scope:
  - docs-first registration for the current Linear worker issue
  - one bounded archive matcher plus task-index discovery hardening fix in `scripts/implementation-docs-archive.mjs`
  - focused regression coverage in `tests/implementation-docs-archive.spec.ts`
  - validation and PR handoff prep for the issue
- Constraints:
  - keep the broader policy scope intact unless contrary evidence appears
  - keep the implementation fix small and avoid unrelated archive workflow changes
  - record delegation override explicitly because this worker run cannot spawn subagents

## Technical Requirements
- Functional requirements:
  - policy patterns like `docs/PRD-*.md`, `docs/TECH_SPEC-*.md`, and `docs/ACTION_PLAN-*.md` must match linked implementation doc references exactly as written in policy
  - task-linked doc extraction must include linked PRD/TECH_SPEC/ACTION_PLAN docs when they match policy patterns, whether the task index uses legacy `path`, `relates_to`, or canonical `paths.*`
  - indexed task doc candidates must be canonicalized back to repo-relative paths and skipped when they resolve outside the repo root
  - archive output must still write payloads before stubs and keep existing stub link behavior unchanged
- Non-functional requirements (performance, reliability, security):
  - preserve current task/spec/.agent triad selection behavior
  - keep the patch narrow enough for straightforward audit and rollback
  - avoid changes to secrets, auth, or external workflow credentials while preventing repo-escape reads and writes from indexed path inputs
- Interfaces / contracts:
  - input contract: `docs/implementation-docs-archive-policy.json` `doc_patterns` plus task-index path fields
  - implementation contract: `globToRegExp(...)`, repo-relative path normalization, and canonical `paths.*` discovery in `scripts/implementation-docs-archive.mjs`
  - regression contract: `tests/implementation-docs-archive.spec.ts` must prove linked docs matching plain `*` patterns archive into payloads and stubs for both legacy `path` and canonical `paths.docs`, must reject repo-escape indexed paths, and must keep explicit task packet paths out of stray archival

## Architecture & Data
- Architecture / design adjustments:
  - no architecture change; this is a policy-to-implementation alignment fix within the existing archiver
  - canonical `tasks/index.json` entries seed archive discovery through explicit `paths.*`, so the archiver must read those fields alongside legacy `path` and `relates_to`
  - existing docs policy and archive workflow remain authoritative for scope
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - local archive policy JSON
  - local archive script and Vitest harness
  - Linear issue handoff workflow

## Validation Plan
- Tests / checks:
  - docs-review on the new task packet before code edits
  - focused archive regression coverage, including repo-boundary and explicit task-path cases
  - required repo validation floor after implementation
- Rollout verification:
  - confirm archive test produces payload + stub output for linked PRD/TECH_SPEC/ACTION_PLAN docs
  - confirm no code path narrows policy scope
  - attach the resulting PR to Linear before moving to `In Review`
- Monitoring / alerts:
  - use the Linear workpad for operator-facing status
  - use test output and validation logs as the primary evidence

## Open Questions
- None.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-22

## Manifest Evidence
- Docs-review manifest: `.runs/linear-856c1318-524f-4db3-8d4a-b357ec51c304/cli/2026-03-22T12-45-37-444Z-4447037c/manifest.json`
- Validation summary: `out/linear-856c1318-524f-4db3-8d4a-b357ec51c304/manual/20260323T003457Z-provider-rework/validation-summary.md`
