---
id: 20260308-1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction
title: Coordinator Symphony-Aligned Control Action Controller Sequencing Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Action Controller Sequencing Extraction

- Task ID: `1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`

## Scope

- Extract the remaining `/control/action` controller sequencing seam from `controlServer.ts`.
- Centralize replay short-circuit, cancel confirmation gating/resolution, and execution handoff decisions in a dedicated helper.
- Preserve controller-owned persistence, publish, audit emission, raw HTTP writes, and route-level auth/request parsing.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/controlActionPreflight.ts`
- `orchestrator/src/cli/control/controlActionCancelConfirmation.ts`
- `orchestrator/src/cli/control/controlActionExecution.ts`
- `orchestrator/src/cli/control/controlActionFinalization.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated sequencing helper under `orchestrator/src/cli/control/`.
2. The helper should accept the normalized request context plus narrow callbacks/adapters for already-extracted responsibilities and return a typed next-step contract for the controller.
3. Centralize the decision surface that:
   - runs cancel-only replay short-circuiting when transport resolution is not deferred
   - requires confirmation when cancel lacks a valid confirm nonce
   - resolves cancel confirmation and updates canonical request/intent/transport state
   - re-validates transport mutation state after confirmation resolution
   - decides when execution/finalization should proceed
4. Keep `controlServer.ts` responsible for:
   - auth, CSRF, request body reading, and normalization
   - actual calls that persist control/confirmations state
   - actual runtime publish
   - actual audit emission
   - raw HTTP response writes
5. Keep the helper typed and bounded; avoid collapsing the full route into a single opaque handler.

## Risks / Guardrails

- Pre-confirm replay ordering must remain unchanged.
- Cancel confirmation resolution must continue to be cancel-only and preserve canonical request/intent ids.
- Transport mutation re-validation after confirmation resolution must remain explicit and test-covered.
- The extraction must not hide which path writes `confirmation_required` versus replay/applied success responses.
- The helper should compose existing extracted modules instead of re-owning their logic.

## Acceptance Criteria

- A sequencing helper owns the controller branch contract for replay, confirmation resolution, and execution handoff.
- `controlServer.ts` becomes narrower without surrendering final mutation and side-effect authority.
- Existing `/control/action` contracts and side-effect ordering remain unchanged.

## Validation

- Direct helper tests covering non-cancel execute, cancel replay short-circuit, confirmation-required, confirmation-resolved, and transport re-validation paths.
- Targeted `ControlServer` regressions for replay-before-confirmation, invalid confirmation nonce rejection, resolved-cancel execution, and post-confirm transport validation failure.
- Manual mock sequencing artifact.
- Standard closeout lane: delegation guard, spec guard, build, lint, test, docs check, docs freshness, diff budget, review, and `pack:smoke` only if downstream-facing paths change.

## Review Notes

- 2026-03-08 top-level read-only review approved this as the next smallest useful seam after `1055`; evidence: `docs/findings/1056-control-action-controller-sequencing-deliberation.md`.
- 2026-03-08 bounded `gpt-5.4` research corroborated that the remaining inline seam is controller sequencing and that Symphony should guide the structural direction rather than the literal `/control/action` surface; evidence: `docs/findings/1056-control-action-controller-sequencing-deliberation.md`.
- 2026-03-08 docs-review wrapper reached green deterministic docs stages after an explicit registry-id override, then drifted into low-signal review exploration and was overridden; evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T014345Z-docs-first/05-docs-review-override.md`.
