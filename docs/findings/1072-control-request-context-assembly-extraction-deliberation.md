# 1072 Deliberation - Control Request Context Assembly Extraction

## Decision

Queue the next bounded Symphony-aligned slice on the remaining request-context assembly cluster in `controlServer.ts`: `buildContext(...)`, `buildInternalContext(...)`, and the nearby per-request composition that still threads the same stores, tokens, paths, and runtime handles into helper flows.

## Why this seam next

- After `1071`, `controlServer.ts` no longer owns event transport, which makes the duplicated context-builder responsibilities easier to isolate cleanly.
- The remaining shared context composition is cohesive enough to extract without reopening route/controller authority.
- This keeps the Symphony-alignment sequence moving by shrinking the server shell without introducing a generic container abstraction.

## Boundaries to keep

- Keep raw HTTP admission, route dispatch, SSE client registration, and server close ownership in `controlServer.ts`.
- Keep the extracted module bounded to request-context assembly and nearby shared composition only.
- Do not widen into controller extraction, watcher work, or review-wrapper work.
