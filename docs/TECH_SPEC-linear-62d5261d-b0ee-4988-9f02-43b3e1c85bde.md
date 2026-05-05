---
id: 20260505-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde
title: "CO-434 oversized docs-freshness canonical owner reuse"
relates_to: docs/PRD-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md
risk: medium
owners:
  - Codex
last_review: 2026-05-05
canonical_owner_marker: codex-orchestrator:canonical-owner-key=baseline_cohort_id_sha256:8fe99c9bccb9aba10ce27a2ac178403a2f26b80a4445c8279f52b01da699ae2d
---

# TECH_SPEC Mirror - CO-434 oversized docs-freshness canonical owner reuse

This mirror points to the canonical task spec at `tasks/specs/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`.

## Canonical Reference
- PRD: `docs/PRD-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`
- Canonical TECH_SPEC: `tasks/specs/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`
- Task checklist: `tasks/tasks-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`
- Agent mirror: `.agent/task/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`

## Implementation Summary
- Update canonical owner marker detection in `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts` so exact asterisk-bulleted marker lines are recognized alongside exact hyphen-bulleted marker lines.
- Keep exact marker matching, same-team/same-project filtering, non-terminal filtering, and prefix-only rejection unchanged.
- Add a focused facade regression using the CO-434 oversized hashed canonical owner key and an asterisk-bulleted marker description.

## Validation Contract
- `npm run test -- ProviderLinearWorkflowFacade.test.ts`
- `npm run docs:freshness:maintain -- --format json`
- Full pre-handoff validation per the task checklist before review handoff.
