# TECH_SPEC - CO-456 spec-guard external migration cap timeout stabilization

## Canonical Reference
- PRD: `docs/PRD-linear-de299bad-c345-4259-8551-73dd429eccca.md`
- Canonical task spec: `tasks/specs/linear-de299bad-c345-4259-8551-73dd429eccca.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-de299bad-c345-4259-8551-73dd429eccca.md`
- Task checklist: `tasks/tasks-linear-de299bad-c345-4259-8551-73dd429eccca.md`
- Agent mirror: `.agent/task/linear-de299bad-c345-4259-8551-73dd429eccca.md`

## Summary
- Objective: stabilize `tests/spec-guard.spec.ts` external-migration-cap tests so they no longer exceed Vitest's per-test timeout.
- Root cause: the failing cases batch many labels inside one `it`; every label creates a temp git repo, commits fixture docs/code, and runs `node scripts/spec-guard.mjs --dry-run`. The slow path is assertion setup plus repeated subprocess execution inside a single timeout window, not a policy failure.
- Implementation: convert the two expensive loops into parameterized `it.each` cases. This keeps every label and assertion intact while giving each fixture/subprocess run its own bounded Vitest test case.
- Full-test isolation: the first full run then exposed an inherited provider-worker review env leak in an existing command-surface test. The test already scrubbed non-interactive review flags; CO-456 also scrubs `CODEX_REVIEW_AUTHORITATIVE_GATE` there so exact `npm run test` can run in provider-worker sessions.

## Issue-Shaping Contract
- Protected terms:
  - `npm run test`
  - `tests/spec-guard.spec.ts`
  - `external migration cap`
  - `false reviewer-approval labels`
  - `deprecation-plan labels`
  - clean `origin/main`
  - provider-worker validation gate
- Wrong interpretations to reject:
  - skip the failing tests
  - weaken the assertions for false reviewer approval, negated external signals, or empty deprecation-plan labels
  - change fallback cap durations
  - hide unrelated validation failures as spec-guard timeout fixes

## Technical Requirements
1. Reproduce the focused timeout.
2. Split the `false reviewer-approval labels` loop into parameterized tests with the same expected `general repo fallback cap` failure assertions.
3. Split the `empty deprecation-plan labels` loop into parameterized tests with the same expected `general repo fallback cap` failure assertions.
4. Leave negated external signal tests and valid affirmative external migration cap tests intact.
5. Record focused and full validation evidence.
6. Keep the command-surface env scrub limited to test harness isolation; it must not change review-wrapper runtime behavior.

## Validation Plan
- `npm run test:core -- tests/spec-guard.spec.ts -t "external migration cap"` before/after evidence.
- `npm run test` to prove the full provider-worker test gate no longer fails because of the CO-456 spec-guard timeout cluster.
- `node scripts/spec-guard.mjs --dry-run` after docs and test edits.
- Required repo handoff gates before review state.

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tests/spec-guard.spec.ts` external migration cap coverage | repeated git fixture and subprocess setup batched inside one Vitest test timeout | justify retaining fallback | CO-456 | `false reviewer-approval labels` and `deprecation-plan labels` assertions are expensive when batched | 2026-05-01 | 2026-05-01 | Retained policy, timeout seam removed in this issue | each label runs as its own parameterized test with bounded inputs | focused `tests/spec-guard.spec.ts`, `npm run test`, provider-worker validation gate |

## Open Questions
- None. The current change is tests-only plus traceability docs.
