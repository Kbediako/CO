# 1050 Next Slice Note

- Recommended next bounded seam: extract the `/control/action` request parsing and normalization preflight into a dedicated helper/controller boundary while keeping final control mutation and authority decisions in `controlServer.ts`.
- Why this is next:
  - After `1050`, the confirmation-route controller family is complete, and the largest remaining inline surface in `controlServer.ts` is the `/control/action` path.
  - The next useful reduction is to peel off the request-shaping and validation preflight without weakening the authority-bearing apply/replay/reject decisions.
- Constraints for the follow-on slice:
  - Keep final control-state mutation, event emission, and authority policy in `controlServer.ts`.
  - Preserve transport/idempotency/request-trace contracts exactly.
  - Do not widen into cross-route abstractions unless the preflight extraction proves inseparable.
