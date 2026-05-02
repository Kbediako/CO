# Action Plan: CO-456 spec-guard external migration cap timeout stabilization

## Scope
- Task id: `linear-de299bad-c345-4259-8551-73dd429eccca`
- Registry id: `20260501-linear-de299bad-c345-4259-8551-73dd429eccca`
- Linear issue: `CO-456`
- Issue id: `de299bad-c345-4259-8551-73dd429eccca`

## Plan
1. Register the CO-456 docs-first packet and mirrors.
2. Reproduce `npm run test:core -- tests/spec-guard.spec.ts -t "external migration cap"` timeout evidence.
3. Identify the slow path in `tests/spec-guard.spec.ts`.
4. Split only the expensive table loops into parameterized tests while preserving every external-migration-cap assertion.
5. Scrub inherited `CODEX_REVIEW_AUTHORITATIVE_GATE` in the existing command-surface non-interactive review handoff test so provider-worker env does not block exact full-test validation.
6. Run focused and full validation; classify any non-CO-456 failures separately.
7. Complete repo gates, standalone review, elegance review, PR attachment, and `pr ready-review` before review handoff.

## Acceptance Criteria
- [ ] Timeout reproduced and slow path identified as repeated git fixture/subprocess assertion setup inside single Vitest cases.
- [ ] False reviewer-approval, negated external signal, and empty deprecation-plan label assertions remain present and strict.
- [ ] Reduced external-migration-cap subset passes without skipped tests or timeout increases.
- [ ] Full `npm run test` no longer fails because of the CO-456 spec-guard timeout cluster.
- [x] Provider-worker review env no longer breaks the existing command-surface handoff test during full `npm run test`.
- [ ] Validation and review evidence recorded in the workpad.

## Validation
- [x] Child docs lane completed and was accepted: `.runs/linear-de299bad-c345-4259-8551-73dd429eccca-docs-packet/cli/2026-05-01T03-01-11-354Z-21ccbfb3/manifest.json`.
- [ ] Focused before/after `npm run test:core -- tests/spec-guard.spec.ts -t "external migration cap"`.
- [ ] Full `npm run test`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] Required repo validation and review handoff gates.

## Risks
- A timeout-only change could mask policy weakening; mitigated by keeping all assertion bodies unchanged.
- Full `npm run test` may expose unrelated baseline failures; those must be labeled separately rather than folded into CO-456.
