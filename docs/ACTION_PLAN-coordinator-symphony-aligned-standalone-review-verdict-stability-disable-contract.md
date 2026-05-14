# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Verdict-Stability Disable Contract

## Summary
- Goal: harden the documented verdict-stability disable contract with explicit wrapper isolation and disabled-path coverage.
- Scope: env scrubbing plus focused wrapper/docs updates only.
- Assumption: existing timeout/stall transport remains authoritative when verdict-stability is explicitly disabled.

## Milestones & Sequencing
1. Register the `1136` docs-first package and capture why the disable contract is the next smaller truthful seam after `1135`.
2. Scrub `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS` from the shared wrapper test env helper.
3. Add a focused disabled-path wrapper regression while preserving the enabled-path verdict-stability assertions.
4. Run the bounded validation stack, close the lane, and record the next follow-on seam.

## Dependencies
- `1135` closeout evidence, especially the recorded drift into broader verdict/timedOut semantics.
- Existing verdict-stability cases in `tests/run-review.spec.ts`.

## Validation
- Checks / tests:
  - docs-first guard bundle
  - focused `tests/run-review.spec.ts` verdict-stability regressions
  - build / lint / test / docs guards / review / pack-smoke on the final tree
- Rollback plan:
  - revert the env scrubber and disabled-path regression if the slice broadens or weakens existing verdict-stability behavior.

## Risks & Mitigations
- Risk: the disabled-path test becomes flaky because another guard fires first.
  - Mitigation: explicitly disable stall and use a short overall timeout so the fallback remains deterministic.
- Risk: the lane broadens into a generic timeout transport redesign.
  - Mitigation: keep changes scoped to test env isolation and the documented disable behavior only.
