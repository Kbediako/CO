# Findings - 1021 Telegram In-Process Read Model Reuse Deliberation

- Proceed with a narrow follow-up slice after `1020` to remove Telegram's in-process self-HTTP reads.
- Keep the slice bounded:
  - inject a fresh-read Telegram adapter for state/issue/dispatch/questions plus issue resolution,
  - keep Telegram text formatting inside the bridge,
  - keep `/pause` and `/resume` on the existing `/control/action` HTTP path for now.
- Real Symphony guidance is structural, not literal:
  - upstream snapshot-first internal reuse remains the reference,
  - CO should keep its hardened transport/idempotency layer rather than folding the write path into this read-side slice.
- The most coherent follow-on after this slice is an internal observability update notifier closer to Symphony's PubSub pattern, not a mutation-path rewrite.
- Do not widen scope into direct mutation-service extraction, auth/session, SSE, refresh semantics, or Linear authority changes in this lane.
