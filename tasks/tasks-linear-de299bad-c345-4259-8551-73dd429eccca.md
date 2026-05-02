# Task Checklist - CO-456

## Docs-First
- [x] PRD, canonical spec, TECH_SPEC mirror, action plan, task checklist, and agent mirror exist for `linear-de299bad-c345-4259-8551-73dd429eccca`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the docs-first packet.
- [x] Protected terms are visible: `npm run test`, `tests/spec-guard.spec.ts`, `external migration cap`, `false reviewer-approval labels`, `deprecation-plan labels`, clean `origin/main`, and provider-worker validation gate.

## Acceptance
- [x] Timeout reproduced and slow path identified.
- [x] External-migration-cap policy assertions remain intact for false reviewer approval, negated external signals, and empty deprecation-plan labels.
- [x] Reduced external-migration-cap subset passes after the test-structure fix.
- [x] Provider-worker review env is scrubbed in the existing command-surface handoff test so exact full-test validation can run.
- [ ] Full `npm run test` reaches a terminal result that is not blocked by the CO-456 spec-guard timeout cluster.
- [ ] Repo gates, review, PR, ready-review, and Linear handoff are complete.

## Validation
- [x] Child docs lane JSON parse, protected-term scan, and `git diff --check`. Evidence: `.runs/linear-de299bad-c345-4259-8551-73dd429eccca-docs-packet/cli/2026-05-01T03-01-11-354Z-21ccbfb3/manifest.json`.
- [x] Reproduced: `npm run test:core -- tests/spec-guard.spec.ts -t "external migration cap"` failed on two 5000ms timeouts.
- [x] Focused pass after fix: `npm run test:core -- tests/spec-guard.spec.ts -t "external migration cap"` passed 36 tests in about 24s.
- [x] Targeted command-surface pass after env scrub: `npm run test:core -- tests/cli-command-surface.spec.ts -t "launches review via the CLI shell in non-interactive handoff mode"`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run test`.
- [ ] Required repo validation, standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff.

## Notes
- The implementation changed test structure only; no `scripts/spec-guard.mjs` policy logic changed.
- Full `npm run test` no longer timed out in `tests/spec-guard.spec.ts`; the inherited provider review-env failure surfaced by the first full run was isolated to the existing command-surface handoff test and fixed with an explicit env scrub.
