# ACTION_PLAN - Coordinator Symphony-Aligned Control Runtime Canonical Read Model Exposure (1026)

## Summary
- Goal: expose a canonical selected-run/read-model seam from `ControlRuntime` and move Telegram read-side status/issue rendering plus projection-push hashing onto that seam.
- Scope: docs-first registration, one bounded runtime/read-model extraction, one Telegram adapter remap, and full validation/closeout evidence.
- Assumptions:
  - `1025` is the latest completed prerequisite,
  - compatibility HTTP routes remain stable in this slice,
  - snapshot reads stay provider-free and authority-neutral.

## Milestones & Sequencing
1) Register `1026` docs-first artifacts and task mirrors from the `1025` next-slice note plus real-Symphony reference evidence.
2) Run `docs-review` for `1026` and incorporate any required scope refinements before implementation.
3) Add the canonical selected-run/read-model seam to `ControlRuntime` and wire Telegram to consume it for status/issue reads and projection-push hashing.
4) Add targeted regression coverage for the new runtime seam and Telegram render/hash behavior.
5) Run the validation chain, capture manual/elegance evidence, sync mirrors, and commit closeout.

## Dependencies
- Completed slices `1015` through `1025`.
- Real `openai/symphony` upstream at commit `b0e0ff0082236a73c12a48483d0c6036fdd31fe1`.
- Existing Telegram oversight bridge and runtime snapshot tests.

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
  - focused manual/mock Telegram status/issue evidence
- Rollback plan:
  - revert the `1026` runtime-read-model extraction commit if Telegram/runtime parity regresses,
  - preserve current provider and transport boundaries while rolling back only the read-side seam change.

## Risks & Mitigations
- Risk: the runtime seam becomes another transport-flavored abstraction in disguise.
  - Mitigation: keep the new runtime model limited to canonical selected-run, tracked, and dispatch-summary facts only.
- Risk: Telegram issue/status behavior drifts from existing outputs.
  - Mitigation: lock parity down with targeted regression coverage and manual mock evidence.
- Risk: compatibility HTTP behavior changes accidentally during the seam extraction.
  - Mitigation: keep compatibility route methods intact and rerun focused `ControlServer` coverage.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
