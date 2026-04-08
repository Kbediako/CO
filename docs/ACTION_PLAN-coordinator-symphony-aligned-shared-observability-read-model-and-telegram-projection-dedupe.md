# ACTION_PLAN - Coordinator Symphony-Aligned Shared Observability Read Model + Telegram Projection Dedupe (1025)

## Summary
- Goal: unify HTTP/UI/Telegram snapshot shaping behind one shared internal observability read model and close the Telegram question-summary push-dedupe gap.
- Scope: docs-first registration, shared read-model extraction, bounded Telegram hash correction, and full validation/closeout evidence.
- Assumptions:
  - `1024` remains the latest completed prerequisite,
  - snapshot surfaces stay provider-free,
  - the Telegram fix is intentionally limited to visible status/projection dedupe semantics.

## Milestones & Sequencing
1) Register `1025` docs-first artifacts and task mirrors using the real-Symphony and CO-local research findings.
2) Run `docs-review` for `1025` and incorporate any required doc/scope refinements before implementation.
3) Extract the shared internal read-model module and remap observability + Telegram consumers onto it.
4) Add targeted regression coverage for the Telegram prompt/urgency hash case and any shared read-model drift risks.
5) Run the validation chain, capture manual/elegance evidence, sync mirrors, and commit closeout.

## Dependencies
- Completed slices `1015` through `1024`.
- Real `openai/symphony` local clone at `/Users/kbediako/Code/symphony`.
- Existing Telegram oversight bridge tests and live-Linear runtime seams.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
  - focused manual/mock observability + Telegram push evidence
- Rollback plan:
  - revert the `1025` shared read-model extraction commit if surface parity regresses,
  - preserve existing runtime/provider boundaries while rolling back only the read-model refactor.

## Risks & Mitigations
- Risk: refactor collapses too much transport-specific logic into the shared layer.
  - Mitigation: keep the shared module limited to canonical snapshot facts and projection fingerprint inputs; keep HTTP envelopes and Telegram text rendering local.
- Risk: Telegram push behavior changes unintentionally beyond the intended prompt/urgency fix.
  - Mitigation: add explicit regression coverage and manual evidence for both unchanged and changed projection inputs.
- Risk: external-surface contracts widen without backing state.
  - Mitigation: keep payloads field-compatible and reuse only already-backed fields.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
