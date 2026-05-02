# PRD - CO-456 spec-guard external migration cap timeout stabilization

## Traceability
- Linear issue: `CO-456` / `de299bad-c345-4259-8551-73dd429eccca`
- Linear URL: https://linear.app/asabeko/issue/CO-456
- Task id: `linear-de299bad-c345-4259-8551-73dd429eccca`
- Canonical registry id: `20260501-linear-de299bad-c345-4259-8551-73dd429eccca`
- Canonical spec: `tasks/specs/linear-de299bad-c345-4259-8551-73dd429eccca.md`
- Source anchor: `ctx:sha256:a1ecfd97ecbeeb59d0b0a62ed366581334910e18659bc3955e13af24ebed96ab#chunk:c000001`
- Child lane manifest: `.runs/linear-de299bad-c345-4259-8551-73dd429eccca-docs-packet/cli/2026-05-01T03-01-11-354Z-21ccbfb3/manifest.json`

## Summary
- Problem Statement: `npm run test` and `npm run test:core -- tests/spec-guard.spec.ts -t "external migration cap"` time out in `tests/spec-guard.spec.ts` external-migration-cap coverage. The observed slow path is not a desired policy change: two Vitest test cases serialize many git fixture creations and `spec-guard` subprocess runs inside one `it`, exceeding the per-test timeout.
- Desired Outcome: keep external-migration-cap assertions intact while making the reduced subset and full provider-worker `npm run test` gate produce reliable terminal evidence.

## User Request Translation
- Preserve exact protected terms: `npm run test`, `tests/spec-guard.spec.ts`, `external migration cap`, `false reviewer-approval labels`, `deprecation-plan labels`, clean `origin/main`, provider-worker validation gate.
- Identify whether the timeout comes from git fixture cleanup, subprocess timeout, fixture size, or assertion setup.
- Stabilize the tests without skipping coverage, weakening policy assertions, or increasing timeouts blindly.

## Non-Goals
- No change to CO-450 doctor binary-provenance behavior.
- No weakening of `spec-guard`.
- No blanket timeout increase.
- No deletion or skip of external-migration-cap regression coverage.

## Not Done If
- The reduced command still times out.
- The fix passes only because tests are skipped, or policy assertions are weakened.
- `npm run test` still cannot reach terminal evidence because of these spec-guard timeouts.
- The work does not explain the slow path.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `false reviewer-approval labels` | One `it` loops across many labels, paying repeated fixture and subprocess cost. | Each label must still prove the cap is not granted. | Each label remains asserted, but as separate bounded Vitest cases. | Treating false labels as valid reviewer approval. |
| `deprecation-plan labels` | One `it` loops across many weak/empty labels, paying repeated fixture and subprocess cost. | Each label must still prove the cap is not granted. | Each label remains asserted, but as separate bounded Vitest cases. | Treating empty or weak labels as a real deprecation plan. |
| `external migration cap` policy | Existing policy assertions are already present. | Valid affirmative owner, deprecation-plan, and reviewer approval evidence may grant the cap. | Policy behavior is unchanged; only test structure changes. | Cap duration or parser rewrites without evidence. |
| Provider validation | Full `npm run test` is blocked by spec-guard timeout debt. | Provider-worker handoff needs reliable terminal validation. | Focused and full validation are recorded, with unrelated failures classified separately. | Hiding unrelated baseline failures. |

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes, because the tests guard fallback-expiry cap behavior.
- Decision: justify retaining fallback policy unchanged while removing the test-timeout seam.
- Rationale: the external migration cap policy is already strict; the defect is a test harness shape that batches too much expensive setup under one Vitest timeout window.

## Acceptance Criteria
- [x] Reproduce the timeout with current evidence and identify the slow path.
- [x] Keep external-migration-cap policy assertions intact for false reviewer approval, negated external signals, and empty deprecation-plan labels.
- [x] Make the reduced spec-guard subset finish reliably on clean `origin/main`.
- [x] Make full `npm run test` no longer fail because of these spec-guard timeouts.
- [x] Record focused and full validation evidence in the workpad or task packet.

## Validation Evidence
- 2026-05-02: after merging current `origin/main` at `5463be355`, `npm run test:core -- tests/spec-guard.spec.ts -t "external migration cap"` passed with 37 passed / 92 skipped in 13.24s.
- 2026-05-02: full `npm run test` passed with 359 files and 5250 tests passed in 388.80s; `tests/spec-guard.spec.ts` passed under full-suite load in 66.859s.
