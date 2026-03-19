# Findings - 1070 Control Server Bootstrap and Telegram Bridge Lifecycle Extraction Deliberation

## Decision

Queue the next bounded Symphony-aligned slice on the remaining post-bind startup/teardown ownership cluster in `controlServer.ts`: auth/endpoint bootstrap, initial control-state persistence, and Telegram bridge lifecycle wiring.

## Why this seam next

- `1069` extracted the remaining timer/sweep lifecycle cluster.
- The next cohesive non-route concentration is now startup/teardown ownership:
  - control auth/endpoint writes,
  - initial control-state persistence,
  - Telegram bridge start/stop,
  - runtime subscription wiring.
- A bounded scout confirmed that raw `listen()` ownership should stay in `controlServer.ts`; the clean seam starts after the server is already bound and the base URL is known.
- That seam is large enough to extract cleanly without widening back into controller logic.

## Boundaries to keep

- Keep `controlServer.ts` on raw server creation, bind/listen error handling, request handling, and SSE ownership.
- Do not re-open expiry lifecycle ownership from `1069`.
- Do not widen into a generic runtime container or Telegram provider redesign.
- Keep Telegram bridge startup failure non-fatal and warn-and-continue.

## Approval

- 2026-03-08: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1069`, based on the `1069` closeout note and the bounded `gpt-5.4` seam scout captured in `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T143833Z-docs-first/04-scout.md`.
