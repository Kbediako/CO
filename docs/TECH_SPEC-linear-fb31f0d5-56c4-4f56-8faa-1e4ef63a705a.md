---
id: 20260426-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a
title: "CO-394 expire provider workflow fallback mappings"
relates_to: docs/PRD-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md
risk: high
owners:
  - Codex
last_review: 2026-04-26
---

# TECH_SPEC - CO-394 expire provider workflow fallback mappings

This mirror points to the canonical task spec at `tasks/specs/linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`.

## Implementation Summary
- Add a narrow provider workflow fallback expiry registry to `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- Keep behavior unchanged in CO-394; no new provider workflow seam is introduced.
- Record `expire fallback` metadata for:
  - provider-id mapping fallback (`provider_id_fallback` and `buildProviderFallbackTaskId`)
  - retained-claim/autopilot fallback paths that arbitrate current state through cached claim state, retained run identity/proof, or deferred fresh discovery
- Use `CO-400` as the larger provider issue current-state authority owner.
- Add a focused metadata regression and rerun existing ProviderIssueHandoff behavior tests that preserve activation/non-activation behavior.

## Protected Surfaces
- `provider workflow`
- provider-id mapping fallback
- retained-claim/autopilot fallback
- provider issue current-state authority
- CO-125 provider admission and expected-state transition guards

## Fallback Expiry Contract
- Review date: `2026-05-10`.
- Maximum lifetime: `2026-05-26`.
- Owner: `CO-400` for removal/consolidation after CO-394 lands the expiry metadata.
- Removal condition: one provider issue current-state authority order or supported mapping contract removes the need for cached/synthetic fallback arbitration.
- Validation: metadata regression plus existing provider workflow activation/non-activation tests in `ProviderIssueHandoff.test.ts`.

## Implementation Boundaries
- Allowed:
  - metadata registry in `providerIssueHandoff.ts`
  - focused tests in provider workflow test files
  - docs packet and task mirrors
- Not allowed:
  - broad provider issue handoff redesign
  - weakening admission caps, duplicate-worker protection, or expected-state guards
  - changing review, merge, runtime routing, docs freshness, or control-host status fallback behavior
  - adding another fallback branch

## Validation Contract
- Focused tests:
  - new metadata regression proves the provider workflow expiry registry contains required fields for every retained path
  - existing provider-id mapping activation coverage still records the expected fallback task id and mapping source
  - existing retained-claim non-activation coverage keeps fail-closed paths intact
- Gates:
  - `node scripts/spec-guard.mjs --dry-run`
  - focused provider workflow test command
  - `npm run docs:check`
  - `npm run docs:freshness`
  - standalone review and elegance pass before review handoff
