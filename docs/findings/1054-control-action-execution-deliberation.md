# 1054 Control Action Execution Deliberation

- Date: 2026-03-08
- Reviewer: Codex (top-level) with delegated bounded research streams

## Inputs Reviewed

- Current post-resolution `/control/action` execution branch in `orchestrator/src/cli/control/controlServer.ts`
- Existing helper seams in `orchestrator/src/cli/control/controlActionPreflight.ts`, `orchestrator/src/cli/control/controlActionOutcome.ts`, and `orchestrator/src/cli/control/controlActionCancelConfirmation.ts`
- Real `openai/symphony` layering reference:
  - `elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`
  - `elixir/lib/symphony_elixir_web/presenter.ex`
  - `elixir/lib/symphony_elixir/orchestrator.ex`
  - `elixir/lib/symphony_elixir/linear/adapter.ex`
- Delegated bounded read-only findings:
  - `019cc90b-a7ef-7510-b655-1e0d90e1d511`
  - `019cc90c-fd43-77c1-a9da-aae285d83f38`

## Decision

- Chosen next slice: `1054-coordinator-symphony-aligned-control-action-execution-extraction`
- Reason:
  - It is the smallest remaining inline `/control/action` seam after `1051` through `1053`.
  - It aligns with the Symphony pattern of thin controllers delegating orchestration to typed helper/service layers, while preserving CO's stricter authority at the HTTP edge.
  - It also corrects a mild ownership drift by moving replay resolution out of the preflight helper and into the execution helper where it semantically belongs.

## Key Guardrails

- Preserve replay-before-mutation ordering against a fresh snapshot.
- Preserve transport cancel replay precedence and canonical replay-entry actor/source/principal precedence.
- Keep transport nonce consume/rollback durability, actual persistence, runtime publish, audit emission, and raw response writes in `controlServer.ts`.
- Keep persist-before-emit ordering from `1053` unchanged.

## Approval

- Approved for implementation as the next bounded slice after `1053`.
