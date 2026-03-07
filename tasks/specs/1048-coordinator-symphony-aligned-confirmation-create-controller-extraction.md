---
id: 20260307-1048-coordinator-symphony-aligned-confirmation-create-controller-extraction
title: Coordinator Symphony-Aligned Confirmation Create Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-confirmation-create-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

# TECH_SPEC - Coordinator Symphony-Aligned Confirmation Create Controller Extraction

- Task ID: `1048-coordinator-symphony-aligned-confirmation-create-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-confirmation-create-controller-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-confirmation-create-controller-extraction.md`

## Scope

- Extract the `/confirmations/create` route from `controlServer.ts` into a dedicated confirmation-create controller.
- Preserve the current confirmation creation behavior, session-only `ui.cancel` restriction handling, optional auto-pause semantics, `confirmation_required` event emission, and response shape.
- Leave `/confirmations/approve`, `/confirmations/validate`, `/confirmations/issue`, `/confirmations/consume`, `/control/action`, and all non-confirmation routes untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/confirmations.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Pre-Implementation Review Notes

- Approved via delegated boundary review captured in `docs/findings/1048-confirmation-create-controller-extraction-deliberation.md`.
- The next bounded seam is `/confirmations/create`, not `/confirmations/approve`, because create remains the last mostly self-contained confirmation lifecycle route before the higher-authority approval fast-path.

## Acceptance Criteria

1. A dedicated confirmation-create controller handles the route-local `/confirmations/create` request flow.
2. `controlServer.ts` retains top-level route ordering, auth/CSRF/runner-only gating, `/confirmations/approve`, `/confirmations/validate`, `/confirmations/issue`, `/confirmations/consume`, and `/control/action`.
3. Session-only `ui.cancel` restrictions, duplicate-create auto-pause semantics, `confirmation_required` emission, and response payload contracts remain unchanged.
4. Direct controller coverage, server-level regressions, manual mock evidence, and the standard validation lane are recorded before closeout.
