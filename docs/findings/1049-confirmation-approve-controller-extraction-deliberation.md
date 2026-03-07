# Findings - 1049 Confirmation Approve Controller Extraction Deliberation

- Decision: approve docs-first planning for `1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction`.
- Reasoning:
  - After `1048`, `/confirmations/approve` is the next remaining confirmation lifecycle route still embedded in `controlServer.ts`.
  - The branch is more coupled than `/confirmations/create`, but it is still bounded enough to extract without widening into `/control/action`.
  - The main risk is preserving the special `ui.cancel` fast-path exactly, especially its persistence order, `confirmation_resolved` emission, control update, and runtime publication.
- Guardrails:
  - Keep auth/CSRF/runner-only gating and route ordering in `controlServer.ts`.
  - Preserve actor defaulting and `missing_request_id` behavior.
  - Preserve the `409` error mapping for fast-path failures.
  - Do not widen into broader confirmation-store or transport-control abstractions.
