# Findings - 1050 Confirmation List Controller Extraction

- Approved as the next bounded seam after `1049`.
- Rationale:
  - after the create/approve/issue/validate extractions, the remaining inline confirmation lifecycle branch in `controlServer.ts` is `GET /confirmations`;
  - the route is small and low-risk, but it still embeds expiry, list read, sanitization, and response shaping directly in the main server entrypoint;
  - extracting it completes the confirmation-route controller family without widening into the higher-authority `/control/action` path.
- Primary guardrail:
  - preserve expiry-before-read ordering and the sanitized pending confirmation payload shape exactly.
- Explicit non-goal:
  - do not widen this slice into confirmation-store abstraction work or `/control/action`.
