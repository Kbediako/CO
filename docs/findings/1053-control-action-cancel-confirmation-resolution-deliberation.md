# 1053 Control Action Cancel Confirmation Resolution Deliberation

- Date: 2026-03-08
- Reviewer: Codex (top-level) with delegated bounded research streams

## Inputs Reviewed

- Current `/control/action` execution branch in `orchestrator/src/cli/control/controlServer.ts`
- Existing helper seams in `orchestrator/src/cli/control/controlActionPreflight.ts` and `orchestrator/src/cli/control/controlActionOutcome.ts`
- Real `openai/symphony` layering reference:
  - `elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`
  - `elixir/lib/symphony_elixir_web/presenter.ex`
  - `elixir/lib/symphony_elixir/orchestrator.ex`
- Delegated bounded read-only findings:
  - `019cc8e2-0eaa-7460-9162-3f0e137a1cd6`
  - `019cc8e2-132a-7b51-ab55-b67be097ebe2`

## Decision

- Chosen next slice: `1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction`
- Reason:
  - It is the smallest remaining inline mutation-adjacent seam after `1051` and `1052`.
  - It advances CO toward the Symphony-like `controller -> helper/service -> runtime` shape without collapsing CO's stricter mutating authority into an opaque executor.
  - It preserves a bounded diff and keeps replay, nonce consume/rollback, final mutation, publish, and audit authority in `controlServer.ts`.

## Key Guardrails

- Preserve the current `validateNonce()` sequencing and `confirmation_resolved` emission semantics.
- Preserve confirmed-scope override semantics exactly before rerunning transport preflight/replay checks.
- Keep raw HTTP writes, replay execution, final mutation, runtime publish, and audit emission in `controlServer.ts`.

## Approval

- Approved for implementation as the next bounded slice after `1052`.
