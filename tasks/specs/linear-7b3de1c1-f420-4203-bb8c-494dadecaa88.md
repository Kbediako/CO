---
id: 20260423-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88
title: "CO: recreate live owner for remaining Mar 23 docs-freshness task-checklist cohort"
status: done
owner: Codex
created: 2026-04-23
last_review: 2026-05-18
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md
related_action_plan: docs/ACTION_PLAN-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md
related_tasks:
  - tasks/tasks-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md
review_notes:
  - 2026-04-23: Live issue context showed `Ready` with no attached PR and no workpad; parent moved CO-319 to `In Progress`, created the single workpad, and recorded `parallelize_now`.
  - 2026-04-23: `linear create-follow-up --canonical-owner-key ...` created `CO-320` via the `Backlog` path with the exact key and marker for the remaining Mar 23 task-packet cohort; a later live `issue-context` check shows `CO-320` in `In Progress`.
  - 2026-04-23: Same-issue child lane `docs-packet-core` completed successfully but was invalidated because it preserved the wrong fallback evidence set (`docs:freshness:maintain`, `66`, `221`, `1303-1311`, `1164-1195`) instead of the authoritative CO-319 cohort (`1319-1321` and the exact task-packet key).
  - 2026-04-23: Docs-review child stream failed only on standing repo-baseline docs debt, and the manifest-backed standalone review wrapper stalled without terminal telemetry; manual correctness review plus an explicit elegance pass found no open issues in the final docs-only diff.
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (19 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30
follow_up_issue: CO-320
---

## Canonical Reference
- PRD: `docs/PRD-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`
- Task checklist: `tasks/tasks-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`
- Source anchor: `ctx:sha256:7d7386914637615a5543ddd2dbada438fcc7d994a895460fbe20a0ba2401a0b7#chunk:c000001`
- Preserved maintenance report excerpt: `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/manual/co318-preserved-docs-freshness-maintenance-excerpt.json`

## Summary
- Objective: recreate the live same-project owner for the remaining Mar 23 historical task-packet docs-freshness cohort and register that recreated path in the current issue packet/mirrors.
- Scope:
  - CO-319 live issue-context, state transition, workpad, and parallelization record
  - canonical owner recreation using `linear create-follow-up --canonical-owner-key`
  - current issue packet docs, task checklist, agent mirror, task index, docs task snapshot, and docs freshness registry entries
  - truthful recording of the completed-but-invalidated docs child-lane attempt
- Constraints:
  - keep the exact canonical owner key and marker
  - preserve the exact CO-318 maintenance evidence path and values
  - do not reopen `CO-300`
  - do not weaken docs freshness gates
  - do not execute the historical refresh work inside CO-319

## Issue-Shaping Contract
- User-request translation carried forward: CO-319 is the narrow owner-recreation lane for the remaining Mar 23 `tasks/tasks-*` historical docs-freshness cohort; it must establish one live stamped owner issue and keep the historical refresh itself out of scope.
- Protected terms / exact artifact and surface names:
  - `docs:freshness:maintain`
  - `block_unowned_repo_debt`
  - `owner_issue=CO-300`
  - `configured_owner_terminal`
  - `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`
  - `codex-orchestrator:canonical-owner-key=docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`
  - `CO-320`
  - `tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`
  - `tasks/tasks-1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`
  - `tasks/tasks-1319-coordinator-symphony-end-to-end-operational-parity-remediation.md`
  - `tasks/tasks-linear-856c1318-524f-4db3-8d4a-b357ec51c304.md`
- Nearby wrong interpretations to reject:
  - reopen `CO-300`
  - weaken docs freshness
  - perform the historical refresh in this lane
  - create additional owner issues for the same canonical key
- Explicit non-goals carried forward:
  - no historical content refresh inside CO-319
  - no policy or workflow-state broadening beyond current-owner recreation
  - no mutation of unrelated stale cohorts

## Parity / Alignment Matrix
- Current truth:
  - the preserved maintenance report returns `freshness_decision=block_unowned_repo_debt`
  - `owner_issue=CO-300`
  - `owner_issue_action.mode=create_required`
  - `reason=configured_owner_terminal`
  - `stale_entries=4`
  - lineage is `1319-1321`
- Reference truth:
  - same-project recurring baseline debt uses one exact canonical owner issue keyed by the maintenance report
  - the provider-worker follow-up helper can reuse or create that owner using the exact marker only
- Target truth / intended delta:
  - `CO-320` exists as the live owner
  - CO-319 mirrors point at `CO-320`
  - future provider lanes can reuse `CO-320` without duplicate creation
- Explicitly out-of-scope differences:
  - historical packet refresh implementation
  - policy changes
  - reopening terminal owner issues

## Readiness Gate
- Not done if:
  - future lanes can still create a duplicate owner issue for the same key
  - the packet omits the exact canonical owner key or marker
  - the packet omits the preserved maintenance report path or values
  - CO-319 broadens into the actual historical refresh work
- Pre-implementation issue-quality review evidence:
  - 2026-04-23: live issue context confirmed `Ready`, `In Progress` exists as the live started state, no attached PR, and no existing workpad.
  - 2026-04-23: parent created `CO-320` via the `Backlog` path using the exact canonical owner key and marker; current live issue state later advanced to `In Progress`.
  - 2026-04-23: child lane `docs-packet-core` completed successfully, satisfying the parallelization contract, but its patch was invalidated due to concrete evidence mismatch.
- Safeguard ownership split:
  - the invalidated child lane is evidence only
  - parent owns the authoritative packet docs, follow-up mutation, registry/task mirrors, and final validation

## Technical Requirements
- Functional requirements:
  1. Preserve exact canonical owner key `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`.
  2. Preserve exact canonical owner marker `codex-orchestrator:canonical-owner-key=docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`.
  3. Preserve exact maintenance evidence:
     - `freshness_decision=block_unowned_repo_debt`
     - `owner_issue=CO-300`
     - `reason=configured_owner_terminal`
     - `stale_entries=4`
     - lineage `1319-1321`
     - sample task-packet paths from the cohort
  4. Record the recreated live owner `CO-320` in the packet/mirrors.
  5. Record the completed-but-invalidated child-lane attempt truthfully.
- Non-functional requirements:
  - machine-checkable docs and mirror state
  - no code/runtime changes
  - clear audit trail for future provider-worker reuse
- Interfaces / contracts:
  - `linear issue-context`
  - `linear upsert-workpad`
  - `linear parallelization`
  - `linear child-lane`
  - `linear create-follow-up`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`

## Architecture & Data
- Architecture / design adjustments:
  - no application/runtime code changes
  - docs-first packet plus registry/task mirror updates only
- Data model changes / migrations:
  - add new CO-319 docs/checklist surfaces to `docs/docs-freshness-registry.json`
  - add new CO-319 entry to `tasks/index.json`
  - add a current CO-319 snapshot to `docs/TASKS.md`
- External dependencies / integrations:
  - Linear helper CLI for issue context, workpad, parallelization, child-lane audit, and follow-up creation

## Validation Plan
- Tests / checks:
  - `linear issue-context`
  - `linear parallelization`
  - child-lane manifest `.runs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88-docs-packet-core/cli/2026-04-23T01-32-43-084Z-6b522b42/manifest.json`
  - docs-review child stream or truthful fallback
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `npm run review` if the final diff remains non-trivial
- Rollout verification:
  - workpad shows `CO-320` creation and exact marker
  - registry/task mirrors point at the new packet
  - no duplicate owner issue is needed for future lanes
- Monitoring / alerts:
  - future owner recreation or historical refresh lanes should reference `CO-320`, not `CO-300`

## Open Questions
- None currently.

## Approvals
- Reviewer: manual standalone review fallback completed; no open findings
- Date: 2026-04-23
