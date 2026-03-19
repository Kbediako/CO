# Next Slice Note

- Recommended next slice: `Coordinator Symphony-Aligned Linear Webhook Controller Extraction`.
- Why this seam:
  - After the UI data and UI session extractions, the remaining standalone pre-auth route logic in `controlServer.ts` is the `/integrations/linear/webhook` branch.
  - That branch already represents a distinct provider ingress boundary with its own fail-closed semantics, delivery validation, and advisory routing behavior.
  - Extracting it next continues the Symphony-aligned controller thinning while improving the boundary for future live Linear-provider hardening.
- Non-goals for that slice:
  - No webhook signature, replay, or advisory-policy change.
  - No auth/CSRF reordering.
  - No Telegram/control/observability route changes.
