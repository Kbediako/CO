# PRD - Coordinator Symphony-Aligned Control Server Request Shell Extraction

## Summary

After `1084`, `ControlServer.start()` still owns the inline `http.createServer(...)` request shell between seeded runtime assembly and bootstrap/startup delegation. That shell handles pre-instance `503` responses, per-request context assembly, and top-level JSON error mapping around `handleRequest(...)`. This slice extracts that shell into one bounded helper so the server method becomes a thinner composition layer.

## Problem

`ControlServer.start()` still mixes server construction with request-surface concerns:
- creating the HTTP server,
- rejecting requests before the `ControlServer` instance is available,
- building `ControlRequestContext` from the shared runtime state plus `req`/`res`,
- mapping top-level request failures into JSON responses.

That shell is cohesive, but it is not part of seeded runtime assembly, bootstrap assembly, or startup sequencing.

## Goals

- Extract the `http.createServer(...)` request shell from `ControlServer.start()` into one bounded helper.
- Keep `ControlServer.start()` focused on token/seed loading, seeded runtime assembly, instance construction, bootstrap assembly, startup sequencing, and ready-instance return.
- Preserve current pre-instance `503`, request-context identity wiring, and top-level error mapping exactly.

## Non-Goals

- Changing `handleRequest(...)` route logic.
- Changing authenticated-route/controller behavior.
- Changing seeded runtime assembly from `1084`.
- Changing bootstrap assembly or startup sequencing.
- Changing `close()` shutdown ordering.

## User Value

- Continues the Symphony-aligned thin-shell direction for the control server.
- Isolates the HTTP request boundary so future routing/controller hardening can proceed without reopening startup or runtime assembly code.

## Acceptance Criteria

- One helper owns HTTP server creation, pre-instance `503` handling, request-context assembly, and top-level request error mapping.
- `ControlServer.start()` delegates that request shell while preserving current behavior.
- Focused regressions prove unavailable-server handling, live request-context assembly, and top-level error mapping remain unchanged.
