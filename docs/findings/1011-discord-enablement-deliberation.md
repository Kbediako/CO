# Findings - 1011 Discord Enablement Deliberation

- Date: 2026-03-06
- Task: `1011-coordinator-discord-enablement-after-telegram-evidence`
- Scope: define Discord enablement lane after Telegram evidence closure while preserving execution authority boundaries.

## Completed Evidence Inputs
- `tasks/index.json` completion state for task `1009` and in-progress state for task `1010`.
- `docs/TASKS.md` snapshots for tasks `1009` and `1010`.
- `.runs/1009-coordinator-telegram-setup-canary-and-runbook-implementation/cli/2026-03-05T14-10-26-672Z-dd7191f1/manifest.json`.
- `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`.
- `docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md`.

## Fact Register

### Confirmed
- [confirmed] Task `1009` is completed and supplies Telegram evidence closure.
- [confirmed] Task `1010` is currently in-progress with docs-first status and advisory/non-authoritative scope.
- [confirmed] Current control-surface policy keeps CO as execution authority and Coordinator as intake/control bridge.

### Inferred
- [inferred] Discord enablement should proceed as a dedicated lane gated by 1009 closure evidence.
- [inferred] Dependency outputs should include both 1009 closure proof and 1010 status visibility for operators.
- [inferred] Auditable event outputs and deterministic reject reasons are required to keep transport expansion safe.

## Deliberation Outcome
- Proceed with task `1011` as Discord enablement docs-first lane after Telegram evidence closure.
- Preserve hard boundaries:
  - CO execution authority unchanged,
  - Coordinator intake/control bridge only,
  - no scheduler ownership transfer.
- Require explicit auth/token boundaries, idempotency, traceability, and auditable event outputs.
- Require exact 1..10 validation gate order and explicit manual mock requirements in planning artifacts.

## Required Manual Mock Coverage
1. Auth/token fail-closed rejects for missing/expired/replayed/malformed envelopes.
2. Discord ingress/context binding checks with deterministic allow/deny reasons.
3. Idempotent replay/dedupe behavior for duplicate intents.
4. Dependency output checks for 1009 completion and 1010 status visibility.
5. Traceability/audit output checks for full required fields.
6. No scheduler ownership transfer indicators.
