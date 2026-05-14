# PRD - Coordinator Symphony-Aligned Control Server Request Body Helper Extraction

## Summary

After `1088`, `orchestrator/src/cli/control/controlServer.ts` is thinner, but it still owns the shared request-body helper cluster used by both Linear webhook ingress and authenticated-route request parsing. This slice extracts only that raw-body / JSON-body helper surface so `controlServer.ts` keeps request entry/orchestration responsibility while body reading and shared `invalid_json` / `request_body_too_large` behavior move behind one bounded module.

## Problem

The remaining non-minimal `controlServer.ts` surface is now the request-body helper cluster:
- `readRawBody(...)`
- `readJsonBody(...)`
- the shared `HttpError`-backed request-body error boundary they rely on

Those helpers are reused across multiple request branches, but they are not part of branch ordering or route-controller ownership. Keeping them inline leaves the request-entry shell larger than necessary and mixes orchestration with transport-body IO.

## Goals

- Extract the shared request-body helper cluster into one bounded control-local module.
- Keep `controlServer.ts` focused on request entry, route branching, controller wiring, and local shell-only helpers.
- Preserve `invalid_json` and `request_body_too_large` behavior exactly.

## Non-Goals

- Changing route/controller behavior.
- Reworking UI/public-route helpers in the same slice.
- Changing Linear webhook or authenticated-route contracts beyond updated callback imports.
- Broad refactors outside the request-body helper boundary.

## User Value

- Continues the Symphony-aligned thin-shell direction for the control server.
- Makes request-body behavior easier to test directly.
- Keeps future controller extraction work from being blocked by inline body-reader logic.

## Acceptance Criteria

- `controlServer.ts` delegates raw-body / JSON-body helpers to one bounded module.
- Linear webhook and authenticated-route request parsing remain behaviorally identical.
- Focused regressions prove preserved `invalid_json` and `request_body_too_large` behavior.
