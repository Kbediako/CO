# Findings - 1071 Control Event Transport Extraction Deliberation

## Decision

Queue the next bounded Symphony-aligned slice on the remaining control-event transport cluster in `controlServer.ts`: event append, SSE fan-out, dead-client pruning, and runtime publish fan-out.

## Why this seam next

- `1070` extracted the remaining post-bind bootstrap and Telegram bridge lifecycle cluster.
- The next cohesive non-route concentration is now control-event transport:
  - `emitControlEvent(...)`,
  - `broadcast(...)`,
  - SSE client fan-out,
  - runtime publish fan-out.
- That seam is large enough to extract cleanly without widening into request-context composition or route logic.

## Boundaries to keep

- Keep `controlServer.ts` on raw HTTP admission, route dispatch, request-context assembly, and server close ownership.
- Do not re-open expiry or post-bind lifecycle ownership from earlier slices.
- Do not widen into a generic event bus or runtime container abstraction.

## Approval

- 2026-03-08: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1070`, based on the `1070` closeout note that identified control-event transport as the next remaining cohesive non-route concentration.
