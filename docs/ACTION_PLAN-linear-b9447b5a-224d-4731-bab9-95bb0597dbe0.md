# ACTION_PLAN - CO-558 docs freshness maintenance owner replacement

## Summary
- Goal: Replace terminal `CO-522` as the live `docs:freshness:maintain` owner and clear the May 19 freshness maintenance blockers with source-specific evidence.
- Scope: Owner metadata, cohort guide, docs packet, registry/index mirrors, May 19 and May 20 historical cohort routing, pre-expiry review metadata, validation, and review handoff.
- Assumptions: CO-558 is the intended same-project non-terminal owner for canonical owner key `docs:freshness:maintain`; CO-515 remains out of scope.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs:freshness`, `docs:freshness:maintain`, `docs freshness maintenance owner`, `CO-522 terminal owner`, `configured_owner_terminal`, `blocking_changed_paths`, `task_mirror`, `task_packet`, `report_only`, `pre_expiry_entries`, `docs/docs-freshness-registry.json`.
- Not done if: `docs:freshness:maintain` still points at terminal `CO-522`, `docs:freshness` remains blocked by the same May 19 stale baseline, or review-date changes lack source-specific evidence.
- Pre-implementation issue-quality review: CO-558 issue text carries acceptance criteria, non-goals, `Not Done If`, and immediate traceability; baseline report captured at `out/linear-b9447b5a-224d-4731-bab9-95bb0597dbe0/before/docs-freshness-maintenance.json`.
- Fallback / refactor decision: This touches stale/rolling docs freshness ownership and records the required CO-382 decision table below.
- Durable retention evidence: Not applicable; this is expiring owner-routed debt, not a non-expiring retained fallback.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | May 19 owner-routed historical docs freshness cohort | `expire fallback` | `CO-558` | Terminal `CO-522` plus May 19 stale `.agent/task`, task packet, and report-only rows | 2026-05-19 | 2026-05-20 | 2026-05-25 | Refresh, archive, or reclassify the cohort before expiry; re-home again if `CO-558` becomes terminal | `npm run docs:freshness`; `npm run docs:freshness:maintain`; `node scripts/spec-guard.mjs --dry-run`; `npm run docs:check` |
| `docs:freshness:maintain` | May 20 owner-routed Apr 19 task/report cohort | `expire fallback` | `CO-558` | Apr 19 task mirror, task packet, and report-only rows entered the rolling maintenance window while `CO-558` remained live owner | 2026-05-20 | 2026-05-20 | 2026-05-26 | Refresh, archive, or reclassify the cohort before expiry; re-home again if `CO-558` becomes terminal | `npm run docs:freshness`; `npm run docs:freshness:maintain`; `node scripts/spec-guard.mjs --dry-run`; `npm run docs:check` |

Large-refactor check: Existing owner verification and canonical owner action evidence are sufficient; this lane repairs live metadata and cohort evidence rather than adding another owner-resolution seam.
Minor-seam decision: The retained cohort stays inside the existing owner-routed maintenance mechanism with a short expiry, so no additional seam is introduced.

## Milestones & Sequencing
1. Baseline and packet
   - Capture current `docs:freshness:maintain` evidence.
   - Create/register CO-558 packet and mirrors.
   - Keep one active Linear workpad current.
2. Owner re-home and cohort evidence
   - Update `docs/docs-catalog.json` live owner from terminal `CO-522` to `CO-558`.
   - Update `docs/guides/docs-freshness-cohorts.md` with May 19 evidence and CO-558 rolling disposition.
   - Re-home/declare or refresh the Apr 18 `.agent/task`, task packet, and report-only cohort without hiding stale evidence.
   - Re-home/declare the May 20 Apr 19 task mirror, task packet, and report-only cohort without hiding stale evidence.
3. Pre-expiry direct review
   - Review `.agent/task/templates/codex-cli-release-intake-template.md`, `skills/agent-first-adoption-steering/SKILL.md`, `skills/long-poll-wait/SKILL.md`, and spec pre-expiry rows.
   - Review `docs/book/**`, `skills/README.md`, and the May 20 spec pre-expiry rows before changing freshness metadata; record terminal frontmatter disposition for completed source issues instead of editing legacy fallback content when no content change is needed.
   - Update only backed review metadata and record evidence.
4. Validation and handoff
   - Run `npm run docs:freshness`, `npm run docs:freshness:maintain`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`.
   - Run standalone review, elegance pass, PR checks, and `pr ready-review` before `In Review`.

## Dependencies
- Linear issue-context for CO-558 and CO-522 owner truth.
- Current `docs:freshness:maintain` report.
- Same-issue child-lane packet output, when successful.

## Validation
- Checks / tests:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - review telemetry and `pr ready-review`
- Rollback plan: Revert the CO-558 branch; terminal `CO-522` blocker remains visible and fail-closed, so rollback does not hide stale docs.

## Risks & Mitigations
- Risk: Blind review-date updates. Mitigation: record source-specific review evidence in task packet/cohort guide and update only reviewed rows.
- Risk: Over-broad cleanup of historical docs. Mitigation: preserve files and machine-visible rolling/cohort evidence.
- Risk: CO-515 scope bleed. Mitigation: no CO-515 source files or control-host behavior changes.
- Risk: Child lane drift. Mitigation: parent invalidates drifted lanes and keeps lifecycle/Linear/PR mutations parent-owned.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-19.
- May 20 update: current-main verification added the Apr 19 rolling cohort, refreshed reviewed public/skill pre-expiry metadata, and added terminal frontmatter disposition for completed spec rows under the same CO-558 owner evidence.
