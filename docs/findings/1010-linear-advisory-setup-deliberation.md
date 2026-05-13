# Findings - 1010 Linear Advisory Setup Deliberation

- Date: 2026-03-06
- Task: `1010-coordinator-linear-advisory-setup-and-runbook-implementation`
- Scope: define non-authoritative Linear advisory setup/runbook implementation boundaries after Telegram prerequisite closure.

## Completed Evidence Inputs
- `tasks/index.json` completion state for task `1009`.
- `docs/TASKS.md` snapshot lines for tasks `1008` and `1009`.
- `.runs/1009-coordinator-telegram-setup-canary-and-runbook-implementation/cli/2026-03-05T14-10-26-672Z-dd7191f1/manifest.json`.
- `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`.
- `docs/TECH_SPEC-coordinator-telegram-setup-canary-and-runbook-implementation.md`.

## Fact Register

### Confirmed
- [confirmed] Task `1009` is completed and provides the satisfied Telegram setup/canary prerequisite.
- [confirmed] Current control-surface policy keeps CO as execution authority and Coordinator as intake/control bridge.
- [confirmed] Discord remains deferred in current staged transport sequencing.

### Inferred
- [inferred] Linear advisory setup should run as a dedicated non-authoritative slice to avoid scope coupling with transport authority changes.
- [inferred] Scheduler ownership transfer must remain out of scope for 1010 to preserve existing execution authority boundaries.
- [inferred] Manual advisory mocks are required to prove fail-closed behavior and deterministic replay/rollback before runtime enablement.

## Deliberation Outcome
- Proceed with task `1010` as Linear advisory setup/runbook implementation docs-first lane.
- Preserve hard boundaries:
  - CO execution authority unchanged,
  - Coordinator intake/control bridge only,
  - no scheduler ownership transfer,
  - no Discord enablement.
- Treat Telegram dependency as satisfied input (no re-open of 1009 scope).
- Require explicit manual mock tests and exact validation gate order in planning artifacts.

## Required Manual Mock Coverage
1. Auth/session fail-closed rejections for missing/expired/replayed credentials.
2. Bounded advisory mapping into Coordinator intake/control intents only.
3. Deterministic idempotent replay/dedupe behavior.
4. Rollback drill proving safe baseline restoration.
5. No scheduler ownership transfer indicators.
6. Telegram dependency satisfied proof referenced before 1010 activation.
