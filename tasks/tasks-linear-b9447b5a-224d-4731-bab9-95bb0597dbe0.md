# Task Checklist - CO-558 docs freshness maintenance owner recovery

- Linear Issue: `CO-558` / `b9447b5a-224d-4731-bab9-95bb0597dbe0`
- MCP Task ID: `linear-b9447b5a-224d-4731-bab9-95bb0597dbe0`
- Phase: docs
- Child lane scope: create this task checklist file only.
- Parent-owned integration: registry, owner metadata, Linear state, workpad, PR lifecycle, and final validation.
- Source anchor: `ctx:sha256:beba8ca7181cca9cf41fa09ba8fc3691bf73151b8f081e29993a44127248407d#chunk:c000001`
- Source manifest: `.runs/linear-b9447b5a-224d-4731-bab9-95bb0597dbe0-docs-packet-r2/cli/2026-05-19T01-49-56-177Z-bae26d99/manifest.json`
- Source payload note: the referenced `source.txt` path was not present in this child checkout, so this checklist was created from the child-lane instructions and existing task checklist conventions.

## Scope
- [x] Create `tasks/tasks-linear-b9447b5a-224d-4731-bab9-95bb0597dbe0.md` as the only child-lane edit.
- [x] Keep this child lane docs-only and patch-only.
- [x] Preserve the CO-558 protected terms and owner-maintenance boundary for parent import.
- [x] Parent reconciles this checklist against live CO-558 Linear issue context before updating issue state.
- [ ] Parent updates any required packet mirrors, registry entries, owner metadata, workpad, PR, and Linear lifecycle surfaces.

## Protected Terms
- [x] `docs:freshness`
- [x] `docs:freshness:maintain`
- [x] `docs freshness maintenance owner`
- [x] `CO-522 terminal owner`
- [x] `configured_owner_terminal`
- [x] `blocking_changed_paths`
- [x] `task_mirror`
- [x] `task_packet`
- [x] `report_only`
- [x] `pre_expiry_entries`
- [x] `docs/docs-freshness-registry.json`

## Current Truth To Preserve
- CO-558 is scoped to the `docs:freshness:maintain` owner-maintenance path, not a weakening of `docs:freshness`.
- The parent lane must preserve the `CO-522 terminal owner` evidence and `configured_owner_terminal` classification instead of hiding it with a blind metadata change.
- `blocking_changed_paths` must remain visible as routing evidence and must not be treated as a waiver for repo-wide owner maintenance.
- The parent lane owns any changes to `docs/docs-freshness-registry.json` and must keep `task_mirror`, `task_packet`, `report_only`, and `pre_expiry_entries` classifications truthful.

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | May 19 owner-routed historical docs freshness cohort | `expire fallback` | `CO-558` | Terminal `CO-522` plus May 19 stale `.agent/task`, task packet, and report-only rows | 2026-05-19 | 2026-05-20 | 2026-05-25 | Refresh, archive, or reclassify the cohort before expiry; re-home again if `CO-558` becomes terminal | `npm run docs:freshness`; `npm run docs:freshness:maintain`; `node scripts/spec-guard.mjs --dry-run`; `npm run docs:check` |
| `docs:freshness:maintain` | May 20 owner-routed Apr 19 task/report cohort | `expire fallback` | `CO-558` | Apr 19 task mirror, task packet, and report-only rows entered the rolling maintenance window while `CO-558` remained live owner | 2026-05-20 | 2026-05-20 | 2026-05-26 | Refresh, archive, or reclassify the cohort before expiry; re-home again if `CO-558` becomes terminal | `npm run docs:freshness`; `npm run docs:freshness:maintain`; `node scripts/spec-guard.mjs --dry-run`; `npm run docs:check` |

Large-refactor check: Existing owner verification already detects terminal owners and emits canonical owner action evidence, so this lane repairs live owner metadata plus cohort evidence instead of adding another owner-resolution path.
Minor-seam decision: The retained cohort is bounded owner-routed debt under the existing `docs:freshness:maintain` contract, not a new compatibility seam.

## Acceptance Criteria
- [x] The parent lane verifies the live `docs freshness maintenance owner` state for `docs:freshness:maintain`.
- [x] The parent lane records why the `CO-522 terminal owner` no longer satisfies the live owner requirement, preserving `configured_owner_terminal` evidence.
- [x] The parent lane updates only the appropriate owner/registry surfaces, including `docs/docs-freshness-registry.json`, without changing freshness policy or gate strictness.
- [x] The parent lane preserves actionability for `blocking_changed_paths`, `task_mirror`, `task_packet`, `report_only`, and `pre_expiry_entries`.
- [x] `npm run docs:freshness` is run by the parent and recorded with terminal status.
- [x] `npm run docs:freshness:maintain` is run by the parent and recorded with terminal status.
- [x] `node scripts/spec-guard.mjs --dry-run` is run by the parent and recorded with terminal status.
- [x] `npm run docs:check` is run by the parent and recorded with terminal status.

## Non-Goals
- Do not mutate Linear, GitHub, PR state, workpads, or review lifecycle from this child lane.
- Do not edit `docs/docs-freshness-registry.json`, `tasks/index.json`, `docs/TASKS.md`, owner metadata, or packet mirrors from this child lane.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, registry validation, or docs catalog validation.
- Do not delete, archive, reclassify, or date-bump `task_mirror`, `task_packet`, `report_only`, or `pre_expiry_entries` rows without parent-owned evidence.
- Do not create a duplicate `docs:freshness:maintain` owner if the parent verifies an existing non-terminal owner is already canonical.

## Validation
- [x] Child scoped file creation only. Evidence: this file is the only declared child-lane edit.
- [x] Parent `npm run docs:freshness`.
- [x] Parent `npm run docs:freshness:maintain`.
- [x] Parent `node scripts/spec-guard.mjs --dry-run`.
- [x] Parent `npm run docs:check`.
- [x] Parent protected-term scan across imported packet surfaces includes every CO-558 protected term listed above.
- [ ] Parent records final PR and Linear handoff evidence after checks and review feedback drain cleanly.

## Progress Log
- 2026-05-19: Bounded same-issue child lane created the CO-558 task checklist file only. The supplied source payload path was unavailable in this checkout, so the checklist falls back to the child-lane instructions and keeps registry, owner metadata, Linear, workpad, PR, and validation work parent-owned.
- 2026-05-19: Parent lane re-homed `docs:freshness:maintain` from terminal `CO-522` to live `CO-558`, preserved the May 19 Apr 18 rolling cohort as owner-backed evidence through `2026-05-25`, mirrored the 21 reviewed active spec rows in `docs/docs-freshness-registry.json`, and reran the required docs freshness/spec/docs checks cleanly.
- 2026-05-20: Parent lane reran current-main owner truth, confirmed `CO-558` remains non-terminal and usable, declared the Apr 19 task/report cohort as owner-backed rolling evidence through `2026-05-26`, and reviewed the public/skill/spec pre-expiry rows before refreshing their freshness metadata.
