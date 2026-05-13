# Findings - 1009 Telegram Setup + Canary Deliberation

- Date: 2026-03-06
- Task: `1009-coordinator-telegram-setup-canary-and-runbook-implementation`
- Scope: define Telegram-first implementation slice boundaries and test/gate contract after 1008 readiness closure.

## Completed Evidence Inputs
- `tasks/index.json` task completion state for `1008`.
- `docs/TASKS.md` 1008 completed readiness snapshot.
- `docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`.
- `docs/TECH_SPEC-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`.
- `docs/findings/1008-transport-readiness-deliberation.md`.

## Fact Register

### Confirmed
- [confirmed] 1008 readiness planning is completed and documents Telegram-first rollout with Discord deferred.
- [confirmed] Existing control-surface policy keeps CO as execution authority and Coordinator as intake/control bridge.
- [confirmed] Advisory dispatch posture exists and remains non-authoritative in current evidence.

### Inferred
- [inferred] A dedicated Telegram implementation lane is needed to avoid combining setup/canary execution with multi-transport scope.
- [inferred] Discord should remain deferred in 1009 to keep blast radius bounded while Telegram canary controls are proven.
- [inferred] Linear should be represented as follow-up linkage only in 1009, preserving advisory-only semantics.

## Deliberation Outcome
- Proceed with task `1009` as Telegram setup/canary implementation docs-first lane.
- Preserve hard boundaries:
  - CO execution authority unchanged,
  - Coordinator intake/control bridge only,
  - no scheduler ownership transfer,
  - no Discord enablement.
- Require explicit manual mock tests and exact validation gate order in planning artifacts.

## Required Manual Mock Coverage
1. Auth/session fail-closed rejections for missing/expired/replayed tokens.
2. Bounded command mapping into CO control intents with traceability fields.
3. Idempotent replay/dedupe determinism.
4. Canary rollback drill to safe baseline.
5. No scheduler ownership transfer indicators.
6. Linear advisory linkage remains non-authoritative/no-mutation.
