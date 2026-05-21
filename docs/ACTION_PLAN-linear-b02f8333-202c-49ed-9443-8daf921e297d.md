# ACTION_PLAN - CO-573 docs freshness owner replacement

## Summary
- Goal: Replace terminal `CO-558` as the live `docs:freshness:maintain` owner with non-terminal `CO-573`.
- Scope: Owner metadata, cohort guide, docs packet, task index, freshness registry, validation, review handoff.
- Assumptions: CO-573 is the intended same-project live owner for canonical key `docs:freshness:maintain`; CO-572 remains unrelated baseline-exposure context.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs:freshness`, `docs:freshness:maintain`, `block_spec_guard_pre_expiry`, `owner_issue=CO-558`, `owner_action_evidence=action_required`, `blocking_changed_paths=0`, `policy capacity=over_budget`, `pre_expiry_entries`, `tasks/index.json`, `docs/docs-freshness-registry.json`.
- Not done if: action-required owner truth still points at terminal CO-558, changed-path-free lanes remain blocked without a live owner, or the fix uses blind date bumps/gate weakening/deletion.
- Pre-implementation issue-quality review: CO-573 issue text includes protected terms, non-goals, `Not Done If`, acceptance criteria, validation commands, and a clear CO-572 non-goal.
- Fallback / refactor decision: This touches stale/rolling docs freshness ownership, so the required expiring fallback decision is recorded below.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Current owner-routed stale/pre-expiry docs freshness debt | `expire fallback` | `CO-573` | Terminal `CO-558` plus `block_spec_guard_pre_expiry` and over-budget action evidence with `blocking_changed_paths=[]` | 2026-05-21 | 2026-05-21 | 7 days after normal cadence expiry for each emitted cohort | Refresh, archive, or reclassify the cohort before expiry; re-home again if `CO-573` becomes terminal | `npm run docs:freshness`; `npm run docs:freshness:maintain`; `node scripts/spec-guard.mjs --dry-run`; `npm run docs:check` |

Large-refactor check: Existing owner verification and canonical-owner action evidence already fail closed on terminal owners; a narrow live-owner metadata repair is enough for this lane.

## Milestones & Sequencing
1. Baseline and setup
   - Read live Linear issue context, move Ready to In Progress, create the single workpad, and record the parallelization decision.
   - Reproduce `docs:freshness:maintain` before-state evidence.
2. Owner re-home and packet
   - Update `docs/docs-catalog.json` owner metadata from CO-558 to CO-573.
   - Update `docs/guides/docs-freshness-cohorts.md` with CO-573 live owner lineage and CO-558 terminal evidence.
   - Add CO-573 packet/index/registry mirrors.
3. Validation and handoff
   - Run required docs freshness, maintenance, spec-guard, and docs-check commands.
   - Run standalone review, elegance pass, attach PR, drain ready-review, and update the workpad before review transition.

## Dependencies
- Linear issue-context for CO-573 and historical CO-558 owner truth.
- Current `docs:freshness:maintain` report.
- Same-issue child lane for index/registry audit.

## Validation
- Checks / tests:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - review telemetry and `pr ready-review`
- Rollback plan: Revert the CO-573 branch; terminal CO-558 evidence remains fail-closed rather than hidden.

## Risks & Mitigations
- Risk: Closing CO-573 as terminal while debt remains would recreate the blocker. Mitigation: docs guide states owner must stay non-terminal until refreshed, archived, reclassified, or re-homed.
- Risk: Exact-key retained cohorts are accidentally broadened. Mitigation: leave `canonical_owner_issues[]` unchanged.
- Risk: CO-572 scope bleed. Mitigation: no CO-572 file changes.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-21.
