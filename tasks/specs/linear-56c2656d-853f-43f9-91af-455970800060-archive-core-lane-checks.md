---
id: 20260424-linear-56c2656d-853f-43f9-91af-455970800060
title: "CO-356 archive automation Core Lane checks"
relates_to: docs/PRD-linear-56c2656d-853f-43f9-91af-455970800060.md
risk: medium
owners:
  - Codex
last_review: 2026-04-24
---

# Mini Spec - CO-356 archive automation Core Lane checks

See also:
- `docs/PRD-linear-56c2656d-853f-43f9-91af-455970800060.md`
- `docs/TECH_SPEC-linear-56c2656d-853f-43f9-91af-455970800060.md`
- `docs/ACTION_PLAN-linear-56c2656d-853f-43f9-91af-455970800060.md`

## Scope
- Add a safe `workflow_dispatch` Core Lane path for archive automation PR heads.
- Keep branch protection and required context names unchanged.
- Add focused workflow contract coverage.

## Acceptance
- `core-lane.yml` supports dispatch with archive PR audit inputs.
- `archive-automation-base.yml` dispatches Core Lane after a PR is created or updated.
- Dispatch failure fails the archive automation run.
- Tests prove the workflow contract.

## Validation
- [x] `npm run test -- tests/archive-automation-workflow.spec.ts`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run docs:check`
- [x] Full handoff validation recorded in `tasks/tasks-linear-56c2656d-853f-43f9-91af-455970800060.md`
