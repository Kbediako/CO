# Findings - 1052 Control Action Outcome Shaping Extraction

- Approved as the next bounded seam after `1051`.
- Rationale:
  - after the `/control/action` preflight moved into `controlActionPreflight.ts`, the largest remaining inline route surface is the post-preflight confirmation-versus-apply branch;
  - that branch still mixes confirmation-required fast paths, confirmation-resolution error mapping, replay-versus-apply payload shaping, audit request/intention resolution, and canonical post-mutation traceability construction;
  - extracting only that outcome-shaping surface continues the Symphony-aligned decomposition without weakening CO's harder mutation/publish/audit authority model.
- Primary guardrails:
  - preserve current `409 confirmation_required` and `409 confirmation_invalid` response contracts exactly;
  - preserve replay/apply payload contracts, including `idempotent_replay: true` semantics and request/intent nullability;
  - keep nonce consumption, confirmation persistence, `controlStore.updateAction(...)`, runtime publish, and audit emission in `controlServer.ts`.
- Specific regression watchpoints:
  - replayed transport traceability must still prefer replay-entry actor context over live transport input;
  - confirmation-invalid responses must stay mapped through the existing route shell semantics;
  - extracted outcome shaping must not absorb persistence ordering or rollback behavior.
- Delegation-blocked note:
  - a bounded next-slice research subagent attempt failed under the current ChatGPT-auth account with a usage-limit error at `2026-03-07T14:38Z`.
  - disposition: local docs-first continuation approved with an explicit override until subagent credits reset.
