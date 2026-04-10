# ACTION_PLAN - CO: clear repo-wide stale spec-review dates that are blocking unrelated merge-ready PRs at spec-guard

## Added by Bootstrap 2026-04-10

## Summary
- Goal: remove the completed `1093` through `1109` packet cohort from active-spec freshness blocking while keeping the fix truthful, bounded, and explicitly separate from `CO-102`.
- Scope:
  - docs-first packet, registry mirrors, and saved workpad source
  - audited docs-review child stream
  - targeted quarantine of the completed `1093` through `1109` packet cohort based on existing inactive task-spec status
  - bounded `spec-guard` change to skip inactive specs and archived spec stubs
  - validation plus representative blocked PR evidence
- Assumptions:
  - the cohort is truly completed and no longer belongs in active-spec freshness
  - the repo's full archive stub shape is authoritative enough to distinguish archived specs from active specs, including a same-file `Archive path`

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `spec-guard`, `1093`-`1109`, `CO-102`, `archive/quarantine`, `merge-ready PRs`
- Not done if:
  - the completed cohort still trips `spec-guard`
  - the fix only refreshes dates or waives failures without a truthful packet-state decision
  - the lane broadens into generic `docs:freshness` cleanup
- Pre-implementation issue-quality review:
  - current repo inspection shows the precise mismatch: the `1093` through `1109` packet specs are already completed but still treated as active freshness targets, and the current guard has no inactive-status or archived-stub exemption.

## Milestones & Sequencing
1. Draft the `CO-142` docs packet, registry mirrors, and saved workpad source.
2. Run an audited `linear child-stream --pipeline docs-review` pass and record its outcome.
3. Update `scripts/spec-guard.mjs` so inactive specs and archived spec stubs are excluded from active freshness checks.
4. Add focused tests covering completed-status and archive-stub quarantine while preserving failures for stale active specs.
5. Run validation, collect representative blocked PR evidence, refresh the workpad, and prepare review handoff.

## Dependencies
- `docs/implementation-docs-archive-policy.json`
- `tasks/index.json`
- `scripts/spec-guard.mjs`
- representative PR metadata for `#395`, `#397`, `#399`, `#400`, and `#401`

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review`
  - `node scripts/spec-guard.mjs`
  - repo validation floor if the final diff is non-trivial
  - representative blocked PR evidence check
- Rollback plan:
  - revert the archive stubs and the archived-spec skip together if the guard starts hiding active specs or the archive treatment proves untruthful

## Risks & Mitigations
- Risk: archiving the cohort without a guard change would only postpone the same failure until the archive stub ages out.
  - Mitigation: use status-based quarantine and archive-stub skip together in the guard so inactive packets stay out of active freshness without extra archive churn.
- Risk: the guard could skip more than intended.
  - Mitigation: key the exemption to explicit inactive statuses and the full archive stub shape, including a same-file `Archive path`, rather than looser marker-only or path-only heuristics.
- Risk: the lane drifts into broader docs-freshness cleanup.
  - Mitigation: keep the archive set hard-bounded to `1093` through `1109` and treat other stale baselines as follow-up work only if they materially block this lane.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-10
