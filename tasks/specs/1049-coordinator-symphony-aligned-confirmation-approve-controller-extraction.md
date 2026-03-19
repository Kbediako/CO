---
id: 20260307-1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction
title: Coordinator Symphony-Aligned Confirmation Approve Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

# TECH_SPEC - Coordinator Symphony-Aligned Confirmation Approve Controller Extraction

- Task ID: `1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`

## Scope

- Extract the `/confirmations/approve` route from `controlServer.ts` into a dedicated confirmation-approve controller.
- Preserve ordinary approval behavior plus the existing `ui.cancel` fast-path semantics.
- Leave `/confirmations/create`, `/confirmations/issue`, `/confirmations/consume`, `/confirmations/validate`, `/control/action`, and all non-confirmation routes untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/confirmations.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Pre-Implementation Review Notes

- Approved via boundary deliberation in `docs/findings/1049-confirmation-approve-controller-extraction-deliberation.md`.
- The next bounded seam after `1048` is `/confirmations/approve`, with the main coupling risk concentrated in the `ui.cancel` fast-path rather than in broader control-surface policy.

## Acceptance Criteria

1. A dedicated confirmation-approve controller handles the route-local `/confirmations/approve` request flow.
2. `controlServer.ts` retains top-level route ordering, auth/CSRF/runner-only gating, `/control/action`, and the non-approval confirmation routes.
3. Actor defaulting, approval persistence order, `ui.cancel` fast-path semantics, `confirmation_resolved` emission, and response payload contracts remain unchanged.
4. Direct controller coverage, approval-related server regressions, manual mock evidence, and the standard validation lane are recorded before closeout.
