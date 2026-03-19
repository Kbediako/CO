---
id: 20260308-1051-coordinator-symphony-aligned-control-action-preflight-extraction
title: Coordinator Symphony-Aligned Control Action Preflight Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-action-preflight-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Action Preflight Extraction

- Task ID: `1051-coordinator-symphony-aligned-control-action-preflight-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-preflight-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-preflight-extraction.md`

## Scope

- Extract the `/control/action` request parsing, normalization, transport preflight, and early decision shaping from `controlServer.ts`.
- Preserve canonical replay detection, confirmation-scope transport re-resolution, and early response writing.
- Keep the final control mutation, persistence sequencing, runtime publish, and audit emission in `controlServer.ts`.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/controlState.ts`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated `/control/action` preflight helper module under `orchestrator/src/cli/control/`.
2. Move request-body parsing, action normalization, session/body guardrails, transport mutation resolution, transport-policy validation, confirmation-scope transport re-resolution, idempotent replay lookup, and canonical traceability derivation into that module.
3. Keep the extracted surface narrowly parameterized and data-oriented so `controlServer.ts` still owns final response writes through the existing route shell.
4. Keep `controlServer.ts` responsible for:
   - auth/CSRF/runner-only gating
   - route ordering
   - final HTTP response writes
   - final `controlStore.updateAction(...)`
   - final control persistence and runtime publish decisions
   - audit-event emission after a successful mutation or replay response that survives preflight

## Risks / Guardrails

- The extraction must not change any existing `/control/action` error code, status code, or traceability contract.
- Transport hardening must remain fail closed, including idempotency-key requirements, nonce expiry bounds, consumed-nonce rejection, and allowed-transport enforcement.
- Cancel confirmation flows must still defer transport resolution to the validated confirmation scope when the request omits transport fields.
- The seam must stay bounded to preflight logic and avoid prematurely extracting the remaining authority-bearing mutation path or introducing a generalized parsing utility layer.

## Acceptance Criteria

- No `/control/action` contract regressions for early reject, confirmation-required, replay, or confirmation-scope transport flows.
- Preflight branching leaves final control mutation and publish/audit authority in `controlServer.ts`.
- `controlServer.ts` is reduced by the extracted preflight logic only.

## Validation

- Direct preflight helper tests under `orchestrator/tests/` for invalid action/session guardrails, snake/camel alias normalization, transport preflight rejection, deferred confirmation transport resolution, and replay decision shaping.
- Targeted `ControlServer` regressions covering `/control/action` success, replay, confirmation-required, and transport hardening paths after extraction.
- Manual mock control-action preflight artifact.
- Standard closeout lane: delegation guard, spec guard, build, lint, test, docs check, docs freshness, diff budget, review, and `pack:smoke` only if downstream-facing paths change.
