# ACTION_PLAN - CO-431 canonical-owner docs freshness automation

## Summary
- Goal: close docs freshness recurrence loops by making `docs:freshness:maintain` verify canonical owner state and emit deterministic route/action evidence for recurring owner cases.
- Scope: canonical owner lookup/routing, maintenance JSON evidence, dry-run/no-token copyable bodies, scheduled/preflight wiring, focused tests, and docs packet mirrors.
- Assumptions:
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain` remains the protected canonical owner marker.
  - `CO-428`, `CO-429`, and `CO-430` are the current route targets for stale active-spec, completed-lane registry residue, and terminal-owner replacement.
  - `CO-188` and `CO-323` are historical root-cause attempts that escaped recurrence and must remain cited as evidence.

## Issue Readiness Gate
- Intent checksum / protected terms: `docs:freshness:maintain`, `canonical owner key`, `CO-428`, `CO-429`, `CO-430`, `CO-188`, `CO-323`, create/update action evidence, dry-run/no-token copyable bodies, scheduled/preflight paths.
- Not done if maintenance can create a duplicate while an open same-project exact-marker owner exists, reuses/reopens a terminal owner, omits copyable no-token/dry-run bodies, lets scheduled and preflight paths diverge, or erases CO-188 / CO-323 from the recurrence narrative.
- Pre-implementation issue-quality review:
  - 2026-04-30: CO-431 is broader than one stale-doc fix because correctness depends on exact canonical owner state, route-specific action evidence, and scheduled/preflight parity.

## Milestones & Sequencing
1. Create the CO-431 docs-first packet and mirrors from the parent source anchor.
2. Inspect the existing `docs:freshness:maintain` decision schema and canonical-owner marker emission.
3. Add live owner-state verification keyed by exact canonical owner marker before any create/update decision.
4. Implement route classification for `CO-428` stale active-spec, `CO-429` completed-lane registry residue, and `CO-430` terminal-owner replacement.
5. Extend maintenance output with action evidence: `canonical_owner_key`, `canonical_owner_marker`, owner issue id/key/status when known, intended action, route reason, samples, and copyable issue/update/comment bodies.
6. Preserve dry-run and no-token behavior as report-only with no mutation.
7. Wire scheduled maintenance and provider-worker preflight paths to the same decision contract.
8. Add focused regressions and run parent-owned validation/handoff after patch import.

## Dependencies
`scripts/docs-freshness-maintain.mjs`, `docs:freshness`, `spec-guard`, provider-worker preflight/docs-review checks, scheduled docs truthfulness workflow, Linear canonical owner marker contract, CO-428/CO-429/CO-430 route definitions, and the CO-188/CO-323 historical evidence trail.

## Validation
- Checks / tests: focused route classification/action evidence, exact-marker open owner reuse/update, terminal owner replacement, dry-run/no-token copyable output, and scheduled/preflight report consumption.
- Rollback plan: revert owner-routing changes if they create duplicates, mutate in report-only modes, or weaken hard freshness blockers; preserve packet/history if a widened follow-up is needed.

## Risks & Mitigations
- Fuzzy owner lookup could reintroduce duplicate drift; require exact same-team/same-project canonical marker matches.
- Terminal handling could reopen historical issues; treat terminal owners as evidence and emit replacement action evidence.
- Dry-run/no-token output could be unusable; require copyable issue/update/comment bodies.
- Provider preflight could diverge from scheduled maintenance; consume one shared `docs:freshness:maintain` decision schema.

## Approvals
- Docs packet: same-issue child lane, 2026-04-30.
- Parent implementation/review: pending parent lane patch import and validation.
