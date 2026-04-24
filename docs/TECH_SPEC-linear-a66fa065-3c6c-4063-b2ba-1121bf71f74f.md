---
id: 20260424-linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f
title: "CO-346 skipped review prerequisite-stage truth"
relates_to: docs/PRD-linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f.md
risk: medium
owners:
  - Codex
last_review: 2026-04-24
---

# TECH_SPEC - CO-346 skipped review prerequisite-stage truth

This mirror points to the canonical task spec at `tasks/specs/linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f.md`.

## Implementation Summary
- Update `TaskManager` so build-stage review skips can report a known prerequisite stage instead of always saying `build stage failed`.
- Update `CommandBuilder` so failed command ids and `error_file` artifacts are included in the build result.
- Add focused tests for guard-stage review skips, true build skips, and builder error artifact propagation.

## Evidence Requirements
- Preserve the CO-346 evidence run shape:
  - build `subtaskId`: `docs-review:delegation-guard`
  - manifest `status_detail`: `stage:delegation-guard:failed`
  - command error artifact: `errors/01-delegation-guard.json`
- Do not rely on reading historical `.runs` artifacts at runtime.

## Validation Contract
- Required targeted validation:
  - `npm run test -- orchestrator/tests/TaskManager.test.ts`
  - `npm run test -- orchestrator/tests/CommandBuilder.test.ts`
  - `npm run build`
  - `npm run lint`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Required review before merge:
  - subagent implementation review
  - explicit elegance/minimality review
