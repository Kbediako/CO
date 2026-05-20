---
id: 20260519-linear-b9447b5a-224d-4731-bab9-95bb0597dbe0
title: "CO-558 replace terminal docs freshness maintenance owner"
relates_to: docs/PRD-linear-b9447b5a-224d-4731-bab9-95bb0597dbe0.md
risk: high
owners:
  - Codex
status: in_progress
created: 2026-05-19
last_review: 2026-05-20
review_cadence_days: 30
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
---

# TECH_SPEC - CO-558 docs freshness maintenance owner replacement

## Summary
- Objective: Replace terminal `CO-522` with non-terminal same-project `CO-558` as the usable docs freshness maintenance owner and clear the May 19 maintenance blockers without weakening docs freshness gates.
- Scope: Docs freshness owner metadata, cohort guide, CO-558 docs-first packet, task/index mirrors, freshness registry metadata for reviewed or lifecycle-dispositioned pre-expiry rows, May 19/May 20 rolling cohorts, and preserved evidence reports.
- Constraints: No CO-515 implementation changes; no blind `last_review` bumps; no stale-doc deletion; no cap/window expansion; no owner-verification code changes unless fresh evidence proves metadata-only repair cannot satisfy the issue.

## Issue-Shaping Contract
- User-request translation carried forward: `docs:freshness` failed after the May 19 date rollover because `CO-522` is terminal and the current stale/pre-expiry cohorts need a live maintenance owner and source-specific disposition.
- Protected terms / exact artifact and surface names: `docs:freshness`, `docs:freshness:maintain`, `docs freshness maintenance owner`, `CO-522 terminal owner`, `configured_owner_terminal`, `blocking_changed_paths`, `task_mirror`, `task_packet`, `report_only`, `pre_expiry_entries`, `docs/docs-freshness-registry.json`.
- Nearby wrong interpretations to reject: weakening gates, hiding stale docs, deleting historical docs to pass, blind review-date bumps, or shifting unrelated debt onto CO-515.
- Explicit non-goals carried forward: no provider-intake, WIP cap, control-host, Linear lifecycle authority, or CO-515 behavior changes.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `rolling_freshness_cohorts.owner_issue` | `CO-522`, terminal `Done`. | Terminal owners fail closed. | `CO-558`, live same-project non-terminal. | Reopening `CO-522`. |
| Apr 18 historical cohort | 131 stale rows, no changed-path blockers. | Historical rows can be owner-routed only with explicit rolling/lifecycle evidence. | May 19 cohort is declared or refreshed under CO-558 while remaining visible in reports. | Deleting packet files. |
| Apr 19 historical cohort | 68 stale rows reached the rolling window on May 20 with `blocking_changed_paths=[]`. | The existing owner must route new date-boundary cohorts without creating duplicate owners. | May 20 cohort is declared under CO-558 while remaining visible in reports. | Broad cap/window changes or blind refreshes. |
| Pre-expiry skills/templates/specs | Direct-action rows are inside the review window, and the May 20 spec rows map to terminal Linear issues. | Current docs require real review evidence; completed task packets should be reclassified from lifecycle evidence. | Public/skill rows are reviewed and refreshed; completed-lane spec packets are archived in registry/task-index metadata without editing legacy fallback specs. | Metadata-only churn. |
| CO-515 source issue | Source of follow-up evidence. | CO-515 owns control-host source freshness only. | CO-558 owns repo-wide docs freshness maintenance. | CO-515 implementation edits. |

## Readiness Gate
- Not done if: terminal `CO-522` remains live owner, May 19 stale cohort still blocks `docs:freshness`, strict pre-expiry rows are unreviewed, or validation requires weakened gates.
- Pre-implementation issue-quality review evidence: Issue text includes protected terms, non-goals, `Not Done If`, and required validation. Initial workpad captured a parallelization matrix and baseline proof path.
- Safeguard ownership split: Parent owns owner metadata, registry mirrors, validation, PR, and Linear lifecycle. Same-issue child lanes may create packet-only docs and must not mutate owner metadata or Linear state.

## Technical Requirements
- Functional requirements:
  1. Update `docs/docs-catalog.json` so `policies.rolling_freshness_cohorts.owner_issue` is `CO-558`.
  2. Update `docs/guides/docs-freshness-cohorts.md` so `CO-522` is historical terminal evidence and `CO-558` is the live May 19 owner.
  3. Preserve May 19 baseline evidence: terminal `CO-522`, `configured_owner_terminal`, `blocking_changed_paths=[]`, 131 stale entries, 3 strict pre-expiry docs, and 21 spec pre-expiry entries.
  4. Re-home or refresh the Apr 18 historical `.agent/task`, task packet, and report-only cohort with source-specific lifecycle evidence.
  5. Review and disposition strict pre-expiry skill/template rows plus completed-lane spec packets with explicit CO-558 evidence.
  6. Register the CO-558 packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Non-functional requirements: Keep diffs reviewable and preserve existing JSON formatting.
- Interfaces / contracts: `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, docs catalog policy, Linear owner verification.

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Retained rolling ownership for May 19 historical docs freshness cohort | expire fallback | CO-558 | Terminal `CO-522` plus May 19 stale historical cohort | 2026-05-19 | 2026-05-20 | 7 days after cadence expiry, expires 2026-05-25 | Refresh, archive, or reclassify cohort before expiry; re-home again if CO-558 becomes terminal | Before/after `docs:freshness:maintain`, `docs:freshness`, `spec-guard --dry-run`, `docs:check` |
| `docs:freshness:maintain` | Retained rolling ownership for May 20 Apr 19 task/report cohort | expire fallback | CO-558 | Apr 19 task mirror, task packet, and report-only rows entered the rolling maintenance window while CO-558 remained live owner | 2026-05-20 | 2026-05-20 | 7 days after cadence expiry, expires 2026-05-26 | Refresh, archive, or reclassify cohort before expiry; re-home again if CO-558 becomes terminal | Before/after `docs:freshness:maintain`, `docs:freshness`, `spec-guard --dry-run`, `docs:check` |

- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Large-refactor check: A larger refactor is not selected because existing owner verification already detects terminal owners and emits canonical owner actions; current failure is live owner metadata plus cohort disposition.

## Architecture & Data
- Architecture / design adjustments: Metadata-only owner re-home plus docs evidence updates.
- Data model changes / migrations: JSON updates to catalog, registry, and task index; Markdown updates to cohort guide and packet files.
- External dependencies / integrations: Linear issue-context verification through `docs:freshness:maintain`.

## Validation Plan
- Tests / checks:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - standalone review and elegance/minimality pass before review handoff
- Rollout verification: Attach PR to CO-558, drain `pr ready-review`, then transition to `In Review` only after gates are clean or explicitly waived.
- Monitoring / alerts: `docs:freshness:maintain` report and workpad closeout.

## Open Questions
- None.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-19.
