---
id: 20260502-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312
title: CO-479 active task specs April 1 Linear classification
relates_to: docs/PRD-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md
risk: high
owners:
  - Codex
last_review: 2026-05-02
related_action_plan: docs/ACTION_PLAN-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md
task_checklists:
  - tasks/tasks-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md
---

## Canonical Reference
- Canonical task spec: `tasks/specs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`
- PRD: `docs/PRD-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`
- Task checklist: `tasks/tasks-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`
- `.agent` mirror: `.agent/task/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`
- Source anchor: `ctx:sha256:ad8143d1da80d2c59b489656a2cfc36568c3cbb1256bddf3689f84cd477329bc#chunk:c000001`
- Child lane manifest: `.runs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312-docs-packet/cli/2026-05-02T01-53-30-289Z-5901dd5b/manifest.json`

## Summary
- Objective: mirror the canonical CO-479 spec for classifying stale April 1 source specs and recording the evidence-backed inactive/terminal repair.
- Scope: docs packet, source task specs, task registry, docs freshness registry, docs/TASKS, and task mirrors needed for the CO-479 baseline repair.
- Constraints: no source/test/product code changes, no `spec-guard` policy changes, no blind `last_review` bumps, and no historical packet deletion.

## Issue-Shaping Contract
- User-request translation carried forward: CO-479 should resolve stale `active task specs` with `last_review=2026-04-01` only after parent `live-verify Linear state` proves whether `CO-46`, `CO-62`, `CO-63`, and `CO-57` need active refresh or inactive/terminal reclassification.
- Protected terms / exact artifact and surface names:
  - `spec-guard`
  - `active task specs`
  - `last_review=2026-04-01`
  - `CO-46`
  - `CO-62`
  - `CO-63`
  - `CO-57`
  - `clean origin/main`
  - `live-verify Linear state`
  - `active refresh vs inactive/terminal reclassification`
- Nearby wrong interpretations to reject:
  - blind `last_review` bumps
  - `spec-guard` weakening or skip behavior
  - deleting historical packet evidence
  - hiding this under `CO-474`
  - treating docs:freshness ownership as equivalent to active-spec ownership
  - editing the four source issue specs without live Linear evidence
- Explicit non-goals carried forward:
  - no source issue spec edits before live Linear evidence exists
  - no `spec-guard` policy changes
  - no product code or tests
  - no broad docs:freshness maintenance
  - no deletion or archival of historical packet files merely to clear the gate

## Parity / Alignment Matrix

- Current truth:
  - stale source specs with `last_review=2026-04-01` kept `spec-guard` red on `clean origin/main` before repair
  - the four source issues are `CO-46`, `CO-62`, `CO-63`, and `CO-57`
  - parent live verification confirmed all four source issues are terminal `Done` / `completed` with attached PR evidence
- Reference truth:
  - `spec-guard` should block stale active specs
  - live Linear state is the authority for whether a source spec is active or terminal/inactive
  - historical packet evidence should remain preserved
  - docs:freshness ownership does not replace active-spec ownership
- Target truth / intended delta:
  - each source spec is classified from live evidence
  - all four source specs receive truthful inactive/terminal reclassification
  - source registry and docs freshness rows reflect terminal status while preserving historical packet evidence
  - no blind review-date bump or guard weakening occurs
- Explicitly out-of-scope differences:
  - source-spec updates without live Linear evidence
  - source/test implementation
  - CO-474 ownership changes
  - broad docs:freshness cleanup

## Readiness Gate
- Not done if:
  - CO-479 docs packet and mirrors are incomplete
  - parent cannot identify the classification rule for all four source issues
  - source spec dates/statuses change before `live-verify Linear state`
  - the remediation uses blind `last_review` bumps
  - `spec-guard` is weakened
  - historical packet evidence is deleted
  - CO-479 is hidden under `CO-474`
- Pre-implementation issue-quality review evidence:
  - 2026-05-02: approved for docs packet bootstrap; micro-task is unavailable because the lane depends on exact protected wording, source issue identity, and Linear-state classification.
  - 2026-05-02: source payload path was absent in this child checkout, so the parent-provided prompt and source anchor remain the operative source.
- Safeguard ownership split:
  - docs-packet child lane owned packet/mirror/bootstrap files only
  - parent lane owns live reads, source-spec edits, validation, and lifecycle handoff

## Technical Requirements
1. Bootstrap the PRD, canonical TECH_SPEC, docs TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register CO-479 in `tasks/index.json`.
3. Add CO-479 to `docs/TASKS.md`.
4. Add docs freshness rows for the new packet files.
5. Preserve all protected terms.
6. Reclassify `CO-46`, `CO-62`, `CO-63`, and `CO-57` specs only after live evidence confirms terminal issue state.
7. Update source review dates/statuses, task index mirrors, and docs freshness rows with issue-specific evidence.
8. Keep docs:freshness ownership distinct from active-spec ownership.

## Architecture & Data
- Architecture / design adjustments: none.
- Data model changes / migrations: none; the repair uses existing spec frontmatter, task registry approval metadata, and docs freshness registry fields.
- External dependencies / integrations:
  - `spec-guard`
  - task registry and docs freshness registry
  - parent Linear issue-context reads

## Validation Plan
- `jq empty tasks/index.json docs/docs-freshness-registry.json`
- Protected-term scan across CO-479 packet files.
- `git diff --check -- <touched files>`.
- Live Linear evidence for `CO-46`, `CO-62`, `CO-63`, and `CO-57`.
- Source-spec classification and final `spec-guard`.
- Normal provider-worker build, lint, test, docs, stewardship, diff-budget, standalone review, and elegance gates.

## Open Questions
- Resolved 2026-05-02: none of the four source issues remain active; CO-46, CO-62, CO-63, and CO-57 are terminal `Done` / `completed`.
- Resolved 2026-05-02: no source spec requires active refresh; all four use inactive/terminal reclassification with historical packet evidence preserved.
- Resolved 2026-05-02: post-repair `spec-guard` dry-run proves the April 1 active-spec cohort is no longer a current-main blocker.

## Approvals
- Docs packet child lane: produced in this workspace for parent patch export.
- Parent live verification and source-spec classification: completed on 2026-05-02; CO-46, CO-62, CO-63, and CO-57 are terminal Done/completed with attached merged PR evidence, so the source specs use inactive/terminal reclassification under canonical owner key `spec-guard:active-specs:last_review=2026-04-01`.
- Implementation validation and lifecycle handoff: validation complete; PR handoff remains parent-owned until checks and ready-review drain are clean.
- Date: 2026-05-02
