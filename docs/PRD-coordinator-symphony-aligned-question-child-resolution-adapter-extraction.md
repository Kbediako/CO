# PRD - Coordinator Symphony-Aligned Question Child-Resolution Adapter Extraction

## Summary

After `1072`, `controlServer.ts` still owns the server-specific composition that turns request-context state into the child-run question-resolution adapter used by expiry handling and authenticated question routes. This slice extracts that composition into a dedicated control-local module so the server shell keeps HTTP/provider orchestration while autonomous child-run coordination moves behind a narrower boundary.

## Problem

`controlServer.ts` still directly wires:
- allowed run-root and bind-host policy,
- delegation-token validation,
- parent-run identity lookup,
- fallback audit emission for child-question resolution,
- helper creation for expiry and authenticated question flows.

That is a core autonomy boundary, not raw HTTP shell logic. Leaving it inline keeps the server shell coupled to child-run coordination details that should be reusable and easier to reason about independently.

## Goals

- Extract the control-local child-resolution adapter assembly out of `controlServer.ts`.
- Preserve existing child-run resolution behavior, fallback emission, and run-root policy semantics.
- Keep the seam bounded to adapter composition, not route/controller extraction.

## Non-Goals

- Telegram oversight read-adapter extraction.
- Route/controller extraction.
- Rewriting `questionChildResolutionAdapter.ts` itself.
- New delegation or transport policy.

## User Value

- Strengthens CO’s autonomous run-coordination core without widening into provider/channel code.
- Makes the server shell closer to a hardened Symphony-like outer controller while preserving CO-specific guardrails.

## Acceptance Criteria

- `controlServer.ts` no longer assembles the child-resolution adapter inline.
- A dedicated control-local module owns that assembly and fallback event wiring.
- Existing question/expiry behaviors remain unchanged under focused regression coverage.
