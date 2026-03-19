# 1049 Next Slice Note

- Recommended next bounded seam: extract the `GET /confirmations` pending-list route into a dedicated confirmation-list controller.
- Why this is next:
  - After `1049`, the remaining inline confirmation lifecycle branch in `controlServer.ts` is the pending-list path.
  - It still owns confirmation expiry plus sanitized pending-response shaping, and extracting it would complete the confirmation-route controller family without widening into the higher-authority control mutation path.
- Constraints for the follow-on slice:
  - Keep auth/CSRF gating and overall route ordering in `controlServer.ts`.
  - Preserve the existing sanitized pending confirmation payload shape exactly.
  - Do not widen into `/control/action` or broader confirmation-store abstractions unless the list extraction proves inseparable.
