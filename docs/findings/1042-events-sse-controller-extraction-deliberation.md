# Findings - 1042 Events SSE Controller Extraction Deliberation

- Date: `2026-03-07`
- Decision: approve docs-first planning for the next bounded controller seam.

## Why This Slice

- `1041` removed the standalone Linear webhook path from `controlServer.ts`, leaving `/events` as the next smallest standalone transport-specific route branch.
- The `/events` branch is bounded and route-local: method gating, SSE headers, initial keep-alive bootstrap, client registration, and disconnect cleanup all move together cleanly.
- Route ordering, auth/CSRF, runner-only policy, shared `emitControlEvent` fanout, webhook routes, observability routes, and mutating control endpoints can stay in `controlServer.ts`.

## Delegated Boundary Note

- A delegated read-only seam review confirmed `1042-coordinator-symphony-aligned-events-sse-controller-extraction` as the next smallest Symphony-aligned extraction target after `1041`.
- The key regression surface to preserve is the SSE stream contract: headers, bootstrap payload framing, client registration/removal, and delivery behavior under connect/disconnect churn.
