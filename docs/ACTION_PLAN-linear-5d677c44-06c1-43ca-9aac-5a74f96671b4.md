# ACTION_PLAN - CO-431 canonical-owner docs freshness automation

## Summary
- Goal: close docs freshness recurrence loops by making `docs:freshness:maintain` verify canonical owner state and emit deterministic route/action evidence for recurring owner cases.
- Scope: canonical owner lookup/routing, maintenance JSON evidence, dry-run/no-token copyable bodies, scheduled/preflight wiring, focused tests, and docs packet mirrors.
- Assumptions:
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain` remains the protected canonical owner marker.
  - `CO-428`, `CO-429`, and `CO-430` are the current route targets for stale active-spec, completed-lane registry residue, and terminal-owner replacement.
  - `CO-188` and `CO-323` are historical root-cause attempts that escaped recurrence and must remain cited as evidence.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness:maintain`
  - `canonical owner key`
  - `CO-428`
  - `CO-429`
  - `CO-430`
  - `CO-188`
  - `CO-323`
  - create/update action evidence
  - dry-run/no-token copyable bodies
  - scheduled/preflight paths
- Not done if:
  - maintenance can create a duplicate while an open same-project exact-marker owner exists
  - a terminal owner is reused or reopened automatically
  - no-token or dry-run output lacks copyable issue/update bodies
  - scheduled and preflight paths produce different owner-routing semantics
  - CO-188 or CO-323 are erased from the recurrence narrative
- Pre-implementation issue-quality review:
  - 2026-04-30: CO-431 is broader than one stale-doc fix because correctness depends on exact canonical owner state, route-specific action evidence, and scheduled/preflight parity.

## Milestones & Sequencing
1. Create the CO-431 docs-first packet and mirrors from the parent source anchor.
2. Inspect the existing `docs:freshness:maintain` decision schema and canonical-owner marker emission.
3. Add live owner-state verification keyed by exact canonical owner marker before any create/update decision.
4. Implement route classification for:
   - `CO-428`: stale active-spec
   - `CO-429`: completed-lane registry residue
   - `CO-430`: terminal-owner replacement
5. Extend maintenance output with action evidence:
   - `canonical_owner_key`
   - `canonical_owner_marker`
   - owner issue id/key/status when known
   - `owner_action` such as `update`, `create`, `replace_terminal`, or `noop`
   - route reason and sample paths
   - copyable issue/update/comment bodies
6. Preserve dry-run and no-token behavior as report-only with no mutation.
7. Wire scheduled maintenance and provider-worker preflight paths to the same decision contract.
8. Add focused regressions and run parent-owned validation/handoff after patch import.

## Dependencies
- `scripts/docs-freshness-maintain.mjs`
- `docs:freshness`
- `spec-guard`
- provider-worker preflight/docs-review checks
- scheduled docs truthfulness workflow
- Linear canonical owner marker contract
- CO-428, CO-429, CO-430 route definitions
- CO-188 and CO-323 historical evidence trail

## Validation
- Checks / tests:
  - focused tests for route classification and owner action evidence
  - focused tests for exact-marker open owner reuse/update
  - focused tests for terminal owner replacement
  - focused tests for dry-run/no-token copyable output
  - focused checks that scheduled and preflight paths consume the same maintenance report
- Rollback plan:
  - revert owner-state routing changes if they create duplicate owners, mutate in dry-run/no-token mode, or weaken hard freshness blockers
  - preserve docs packet and historical evidence if implementation needs a widened follow-up

## Risks & Mitigations
- Risk: owner lookup becomes fuzzy and reintroduces duplicate-owner drift.
  - Mitigation: require exact canonical marker matching in the same team/project.
- Risk: terminal owner handling silently reopens or updates closed historical issues.
  - Mitigation: terminal owners are evidence only and must emit replacement action evidence.
- Risk: dry-run/no-token paths are not actionable.
  - Mitigation: require copyable issue/update/comment bodies in report output.
- Risk: provider-worker preflight diverges from scheduled maintenance.
  - Mitigation: consume one shared `docs:freshness:maintain` decision schema.

## Approvals
- Docs packet: same-issue child lane, 2026-04-30.
- Parent implementation/review: pending parent lane patch import and validation.
