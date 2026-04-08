# PRD - Coordinator Discord Enablement After Telegram Evidence (1011)

## Summary
- Problem Statement: Telegram enablement evidence is closed in task 1009, but Discord enablement is still deferred and needs a dedicated, bounded lane after prerequisite evidence closure.
- Desired Outcome: define docs-first implementation scope for Discord enablement through the Coordinator intake/control bridge with explicit authority and security boundaries.
- Scope Status: docs-first planning stream for task `1011-coordinator-discord-enablement-after-telegram-evidence`; runtime implementation remains downstream.

## User Request Translation
- Create and register task lane `1011` with complete docs-first artifacts and registry wiring.
- Make dependencies explicit:
  - Telegram evidence closure from task `1009` is required and satisfied,
  - Linear advisory lane `1010` status must be explicitly tracked as a neighboring dependency context.
- Preserve boundaries:
  - CO remains execution authority,
  - Coordinator remains intake/control bridge only,
  - no scheduler ownership transfer.
- Include explicit auth/token boundaries, idempotency, traceability, auditable event outputs, exact 1..10 validation order, and manual mocks.

## Dependency Status
- Hard prerequisite: task `1009` is completed with terminal implementation-gate evidence.
- Adjacent dependency state: task `1010` remains in-progress (docs-first succeeded) and must remain advisory/non-authoritative.
- Task `1011` must not alter `1009` completion semantics or expand `1010` ownership.

## Authority + Scope Boundaries
- CO remains the only execution authority for run/control state transitions.
- Coordinator is limited to intake/control bridge behavior and cannot own scheduler execution.
- Scheduler ownership transfer is out of scope and forbidden.

## Slice Scope (1011)
- In scope:
  - Discord enablement implementation contract after Telegram evidence closure,
  - bounded auth/token policy for Discord transport ingestion,
  - idempotent replay/duplicate handling,
  - traceability and auditable event output contract for accepted/rejected actions,
  - manual mock matrix for dependency and safety boundaries.
- Out of scope:
  - scheduler ownership transfer,
  - authority changes away from CO,
  - re-opening 1009 closure,
  - changing 1010 advisory scope into authoritative execution.

## Auth/Token + Traceability Contract
- Auth/token boundaries:
  - missing, expired, replayed, or malformed token envelopes must fail closed,
  - accepted requests must be bound to allowed Discord transport/context identifiers.
- Idempotency:
  - duplicate/replayed intents must resolve deterministically with no double-apply.
- Traceability + auditable outputs:
  - each decision emits auditable event output with correlation id, transport, intent, dependency-check result, and allow/deny reason,
  - logs/events must make authority boundary and scheduler non-ownership explicit.

## Manual Mock Test Requirements (Discord)
1. Auth/token fail-closed checks for missing/expired/replayed/malformed token envelopes.
2. Transport/context binding checks for Discord-only enablement path with deterministic deny reasons.
3. Idempotent duplicate-intent replay behavior with deterministic outputs.
4. Dependency checks prove `1009` completion evidence and report current `1010` status in audit outputs.
5. Traceability checks confirm required fields (correlation id, dependency state, transport, intent, allow/deny reason).
6. Auditable event output checks confirm accepted/rejected actions are recorded deterministically.
7. No scheduler ownership transfer indicators appear in status/events.

## Exact Validation Gate Order (Policy)
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`
10. `npm run pack:smoke` (required when touching CLI/package/skills/review-wrapper paths for downstream npm users)

## Acceptance Criteria
1. PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are created for task 1011.
2. `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` include 1011 entries.
3. Dependencies (`1009` complete + `1010` status) are explicit across 1011 artifacts.
4. Auth/token boundaries, idempotency, traceability, and auditable event outputs are explicit and testable.
5. Docs-first validations (`spec-guard --dry-run`, `docs:check`, `docs:freshness`, mirror parity) pass with task-scoped evidence logs.
