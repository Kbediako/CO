# 1085 Deliberation - Control Server Request Shell Extraction

## Decision

Proceed with a bounded control-server request-shell extraction after `1084`.

## Why this seam is next

- `1084` isolated seeded runtime assembly, leaving the inline `http.createServer(...)` shell as the next cohesive concern in `ControlServer.start()`.
- That shell owns transport-level concerns only: pre-instance availability, request-context assembly, and top-level error mapping around `handleRequest(...)`.
- The real upstream Symphony checkout keeps its endpoint shell thin and separate from routing/controller behavior (`elixir/lib/symphony_elixir_web/endpoint.ex` and `router.ex` in the local `openai/symphony` checkout), so this extraction matches the intended layering direction without importing Phoenix-specific structure.

## Out-of-scope guardrails

- Keep `handleRequest(...)` route logic unchanged.
- Keep seeded runtime assembly unchanged.
- Keep bootstrap assembly and startup sequencing unchanged.
- Keep shutdown ordering unchanged.
- Avoid splitting the request shell into multiple helpers/files.

## Approval note

Approved for docs-first registration based on the `1084` next-slice note plus bounded read-only inspection of the remaining inline request shell in `ControlServer.start()`.
