# CO-364 Elegance Review

Date: 2026-04-25

## Invariants
- RLM route defaults must use `gpt-5.5` for `sentinel_model`, `high_reasoning_model`, and `arbitration_model`.
- Explicit route policy overrides must keep taking precedence.
- `explorer_fast`, spark/file-search exceptions, provider-worker/appserver behavior, and generic packaged defaults must remain untouched.

## Minimality Pass
- The implementation changes only the existing `DEFAULT_ALIGNMENT_POLICY.route` literals and focused assertions in `orchestrator/tests/RlmAlignment.test.ts`.
- No new helper, config layer, abstraction, or model-posture resolver is introduced because the existing `resolvePolicy` route merge already preserves override behavior.
- The docs packet is the required CO-364 governance surface; no unrelated CO-356/CO-360 files are touched.

## Result
- No simplification patch needed. The smallest maintainable solution is the direct constant update plus focused default/override regression coverage.
