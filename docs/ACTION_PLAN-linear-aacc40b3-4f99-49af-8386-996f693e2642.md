# ACTION_PLAN - CO-575 docs freshness owner replacement

## Summary
- Goal: Replace terminal `CO-573` as the live `docs:freshness:maintain` owner with non-terminal `CO-575`, then clear the lifecycle drift that still makes completed historical packets count as live docs-freshness debt.
- Scope: Owner metadata, cohort guide, docs packet, task index, freshness registry, implementation-docs archival behavior, validation, PR/review handoff.
- Assumptions: CO-575 is the intended same-project live owner for canonical key `docs:freshness:maintain`; CO-567, CO-570, and CO-574 remain adjacent lanes only.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs:freshness`, `docs:freshness:maintain`, `canonical_owner_key=docs:freshness:maintain`, `owner_issue=CO-573`, canonical owner key, terminal-owner replacement, completed-lane registry residue, stale active-spec routing, fallback/seam metadata routing, dry-run/no-token copyable body.
- Not done if: action-required owner truth still points at terminal CO-573, completed historical packets still consume rolling capacity despite closed task mirrors, changed-path-free lanes remain blocked without a live owner, or the fix uses blind date bumps/gate weakening/deletion.
- Pre-implementation issue-quality review: CO-575 issue text includes protected terms, non-goals, `Not Done If`, acceptance criteria, validation commands, and clear CO-567/CO-574 non-goals.
- Fallback / refactor decision: This touches stale/rolling docs freshness ownership, so the required expiring fallback decision is recorded below.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Current owner-routed stale/pre-expiry docs freshness debt | `expire fallback` | `CO-575` | Terminal `CO-573` plus `block_spec_guard_pre_expiry`, rolling cohort entries, and `blocking_changed_paths=[]` | 2026-05-22 | 2026-06-05 | 2026-06-21 | Refresh, archive, or reclassify the cohort before expiry; re-home again if `CO-575` becomes terminal | `npm run docs:freshness`; `npm run docs:freshness:maintain -- --format json`; `node scripts/spec-guard.mjs --dry-run`; `npm run docs:check` |

Large-refactor check: Existing owner verification and canonical-owner action evidence already fail closed on terminal owners; CO-575 extends the repair to terminal metadata and archive eligibility at the existing lifecycle boundaries instead of adding another owner-resolution fallback.

## Milestones & Sequencing
1. Baseline and setup
   - Read live Linear issue context, create the single workpad, and record the parallelization decision.
   - Reproduce `docs:freshness:maintain` before-state evidence.
2. Packet and owner re-home
   - Add the CO-575 docs-first packet and mirrors.
   - Update `docs/docs-catalog.json` owner metadata from CO-573 to CO-575.
   - Update `docs/guides/docs-freshness-cohorts.md` with CO-575 live owner lineage and CO-573 terminal evidence.
3. Terminal lifecycle repair
   - Preserve archive safety for source, base-revision, and linked task checklist evidence with open items.
   - Keep terminal PRD/spec/action-plan docs visible when they or their authoritative linked checklists still contain open items; do not replace them with archive stubs.
   - Sync `tasks/index.json` terminal metadata only for historical rows with closed task and agent mirrors, and mark remaining visible open-checklist docs with explicit `task_status: open_checklist` registry classification.
4. Validation and handoff
   - Run targeted owner proof first, then spec/docs/stewardship/diff-budget gates.
   - Run review/elegance, open and attach the PR, and update the workpad before review handoff.

## Dependencies
- Linear issue-context for CO-575 and terminal CO-573 owner truth.
- Current `docs:freshness:maintain` report.
- Existing CO-573 packet/PR #866 lineage.

## Validation
- Checks / tests:
  - `npm run docs:freshness:maintain -- --format json`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/audit-archive-stub-unchecked.mjs --format json`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
- Rollback plan: Revert the CO-575 branch; terminal CO-573 evidence remains fail-closed rather than hidden.

## Risks & Mitigations
- Risk: Closing CO-575 as terminal while debt remains would recreate the blocker. Mitigation: docs guide states owner must stay non-terminal until refreshed, archived, reclassified, or re-homed.
- Risk: Exact-key retained cohorts are accidentally broadened. Mitigation: leave `canonical_owner_issues[]` unchanged.
- Risk: Adjacent lane scope bleed. Mitigation: no CO-567, CO-570, or CO-574 file changes.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-22.
