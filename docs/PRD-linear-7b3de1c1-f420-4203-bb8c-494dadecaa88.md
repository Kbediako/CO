# PRD - CO: recreate live owner for remaining Mar 23 docs-freshness task-checklist cohort

## Traceability
- Linear issue: `CO-319` / `7b3de1c1-f420-4203-bb8c-494dadecaa88`
- Linear URL: https://linear.app/asabeko/issue/CO-319/co-recreate-live-owner-for-remaining-mar-23-docs-freshness-task
- Task id: `linear-7b3de1c1-f420-4203-bb8c-494dadecaa88`
- Canonical spec: `tasks/specs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`
- Parent manifest: `.runs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/cli/2026-04-23T01-27-41-396Z-fb6749c4/manifest.json`
- Source anchor: `ctx:sha256:7d7386914637615a5543ddd2dbada438fcc7d994a895460fbe20a0ba2401a0b7#chunk:c000001`

## Summary
- Problem Statement: `CO-318` fixed the current-main spec-guard blocker seam, but the preserved maintenance report still shows unrelated historical repo debt for the remaining Mar 23 `tasks/tasks-*` task-packet cohort. `docs:freshness:maintain` reports `freshness_decision=block_unowned_repo_debt` because configured owner `CO-300` is terminal (`Done`) and cannot be reused as the active owner path.
- Desired Outcome: recreate exactly one live same-project owner for that cohort, preserve the exact canonical owner key and maintenance evidence in the packet, and leave future provider lanes able to reuse `CO-320` instead of reopening `CO-300`, weakening docs freshness, or creating duplicates.

## User Request Translation (Context Anchor)
- User intent / needs: complete the provider-worker lane in the current workspace by creating or reusing the live same-project owner for the remaining Mar 23 historical task-packet docs-freshness cohort, while keeping the work separate from the already-fixed `CO-318` spec-guard seam.
- Success criteria / acceptance:
  - a live owner issue exists for canonical key `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`, created through the `Backlog` follow-up path
  - the owner issue preserves the exact canonical marker `codex-orchestrator:canonical-owner-key=docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`
  - the packet preserves the CO-318 maintenance evidence path and values from the preserved report
  - task/index/docs-freshness mirrors are updated so future workers can follow the current owner path without creating duplicates
- Constraints / non-goals:
  - do not reopen or reuse terminal `CO-300`
  - do not weaken `docs:freshness` or `docs:freshness:maintain`
  - do not broaden `CO-318` into the actual historical packet refresh
  - do not broaden the owner beyond the exact remaining Mar 23 `tasks/tasks-*` cohort

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness:maintain`
  - `block_unowned_repo_debt`
  - `owner_issue=CO-300`
  - `configured_owner_terminal`
  - `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`
  - `tasks/tasks-*`
  - `CO-318`
  - `CO-319`
- Protected terms / exact artifact and surface names:
  - `/Users/kbediako/Code/CO/.workspaces/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/docs-freshness-maintenance.json`
  - `codex-orchestrator:canonical-owner-key=docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`
  - `tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`
  - `tasks/tasks-1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`
  - `tasks/tasks-1319-coordinator-symphony-end-to-end-operational-parity-remediation.md`
  - `tasks/tasks-linear-856c1318-524f-4db3-8d4a-b357ec51c304.md`
  - `CO-320`
- Nearby wrong interpretations to reject:
  - `CO-300` should be reopened and reused
  - the issue should relax docs freshness policy instead of recreating ownership
  - the issue should perform the historical refresh itself rather than only recreate the live owner
  - another owner issue can be created later for the same canonical key

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Historical owner state | The preserved maintenance report still points to `CO-300`, which is terminal (`Done`) and therefore unusable as the active owner. | Recurring baseline debt must converge on one live same-project owner keyed by the exact canonical marker. | `CO-320` exists as the live owner for this exact canonical key; the helper created it via the `Backlog` path and the current live issue now sits in `In Progress`. | Reopening or mutating `CO-300`. |
| Canonical owner identity | The candidate cohort is identified by exact key `docs_freshness_candidate\|doc_class:task_packet\|path_family:tasks/tasks-*\|last_review:2026-03-23\|cadence_days:30`. | `linear create-follow-up --canonical-owner-key ...` reuses or creates one exact stamped owner. | Packet and mirrors preserve the exact key and exact marker so future lanes reuse `CO-320`. | Fuzzy duplicate detection or title-based matching. |
| Evidence preservation | CO-318 maintenance evidence is currently preserved in a sibling issue workspace report. | Owner-recreation lanes must preserve machine-readable evidence and sample paths. | CO-319 packet cites the preserved report path, values, lineage `1319-1321`, `stale_entries=4`, and sample task paths. | Broad historical refresh execution. |
| Docs freshness policy | Existing policy correctly blocks on unowned repo debt. | The correct response is owner recreation, not policy weakening. | Ownership is recreated with no gate changes. | Changing `docs:freshness` or `docs:freshness:maintain`. |

## Not Done If
- Future provider lanes still hit `block_unowned_repo_debt` for this exact cohort because the live owner path is absent or ambiguous.
- Another lane can create a duplicate owner issue instead of reusing the stamped owner issue.
- The packet omits the exact canonical owner key, marker, or preserved maintenance report path.
- The lane broadens into refreshing the historical task-packet cohort itself instead of stopping at owner recreation.

## Goals
- Recreate the live same-project owner path for the remaining Mar 23 task-packet docs-freshness cohort.
- Preserve the exact canonical owner key, exact marker, and machine-readable CO-318 maintenance evidence.
- Register the current issue packet and mirrors so future workers can follow the owner lineage quickly.
- Record the completed-but-invalidated child-lane attempt truthfully so the docs packet remains auditable.

## Non-Goals
- No reopening or reuse of `CO-300`.
- No docs freshness or docs freshness maintenance policy changes.
- No actual refresh of the four historical task-packet files inside CO-319.
- No unrelated backlog cleanup or canonical-owner changes outside this exact cohort.

## Stakeholders
- Product: CO maintainers and provider-worker operators who need deterministic same-project owner reuse for docs debt.
- Engineering: docs freshness maintenance, spec freshness, Linear follow-up ownership, and future provider-worker lanes.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - `CO-320` exists as the live owner with the exact canonical owner key and marker
  - CO-319 packet and mirrors preserve the exact maintenance evidence and point at the recreated live owner path
  - future lanes can reference `CO-320` instead of creating another owner for the same cohort
- Guardrails / Error Budgets:
  - no reopening of `CO-300`
  - no gate weakening
  - no loss of machine-readable evidence
  - no scope expansion into the historical refresh work itself

## Technical Considerations
- Architectural Notes:
  - this is a docs-first and Linear-mutation lane, not a runtime/code-change lane
  - the canonical owner contract is already enforced by `linear create-follow-up --canonical-owner-key`
  - the follow-up owner already created by this lane is `CO-320`
- Dependencies / Integrations:
  - `linear issue-context`
  - `linear upsert-workpad`
  - `linear parallelization`
  - `linear child-lane`
  - `linear create-follow-up`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`

## Open Questions
- None currently. The live owner issue has already been created as `CO-320`; remaining work is packet and mirror truthfulness plus validation.

## Approvals
- Product: Codex provider worker, 2026-04-23
- Engineering: manual standalone review fallback completed 2026-04-23; no open findings remain in the final docs-only diff
- Design: N/A
