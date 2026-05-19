---
id: 20260420-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4
title: "Maintain docs freshness rolling baseline"
status: in_progress
relates_to: docs/PRD-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
related_action_plan: docs/ACTION_PLAN-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md
task_checklists:
  - tasks/tasks-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md
review_notes:
  - 2026-05-18: CO-522 active-spec audit found 1 unchecked task checklist item, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- PRD: `docs/PRD-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`
- Task checklist: `tasks/tasks-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`
- Classification: `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md`
- Source anchor: `ctx:sha256:267aaaf4e2b8fb6c09bc9d87945bbaff87a9974fdda4630798f371e3ff88a0a0#chunk:c000001`

## Summary
- Objective: maintain the repository-wide `docs:freshness` rolling baseline so blocking stale docs and the CO-175 rolling freshness cohort return to a truthful green posture.
- Scope:
  - CO-267 docs-first packet, task mirrors, and workpad
  - before/after `docs:freshness`, `docs:freshness:maintain`, and `spec-guard --dry-run` artifacts
  - classification and reviewed disposition for stale Agent Policy, Active Guide, Shipped Skill, Task Packet, Task Mirror, Report Only, and active spec rows
  - CO-175 rolling freshness cohort review/refresh or explicit current disposition
  - docs freshness registry, task index, task snapshot, and cohort guidance updates needed for future workers
- Constraints:
  - do not expand CO-266 beyond terminal-blocker advisory work
  - do not weaken freshness checks or hide stale rows
  - do not delete docs or registry rows solely to reduce counts
  - do not update `last_review` without classification and review rationale

## Issue-Shaping Contract
- User-request translation carried forward: CO-267 is the canonical repository-wide docs freshness maintenance lane for the Apr 20 stale-doc and CO-175 rolling-baseline debt; CO-266 only owns its scoped terminal-blocker advisory blockers.
- Protected terms / exact artifact and surface names:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `rolling freshness cohort`
  - `CO-175`
  - `stale docs`
  - `canonical owner`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
  - `docs/docs-freshness-registry.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md`
- Nearby wrong interpretations to reject:
  - CO-266 should own the repository-wide sweep
  - stale rows can be hidden by policy broadening or warning-only downgrades
  - registry entries can be removed without review
  - CO-175 rolling debt can remain as an indefinite waiver
  - review dates can be changed without path-level evidence
- Explicit non-goals carried forward:
  - no CO-266 behavior changes
  - no freshness gate weakening
  - no deletion-only cleanup
  - no unrelated feature-lane changes

## Parity / Alignment Matrix
- Current truth:
  - `npm run docs:freshness` fails with `66` blocking stale docs and `221` visible CO-175 rolling entries
  - blocking stale classes are Agent Policy, Active Guide, Shipped Skill, Task Packet, Task Mirror, and Report Only
  - `spec-guard --dry-run` reports stale active specs at `last_review=2026-03-20`
  - `docs:freshness:maintain` reports `block_diff_local` because the current repo baseline is not clean
- Reference truth:
  - prior freshness owner lanes repaired date-boundary cohorts through classification, reviewed refresh, and before/after artifacts
  - CO-175 rolling policy is a visible owner ledger, not a permanent bypass
  - provider-worker gates may pass only when current diff and hard freshness rows are clean
- Target truth / intended delta:
  - exact stale docs/specs and CO-175 rolling rows receive reviewed refresh or explicit owner disposition
  - `docs:freshness` and `docs:freshness:maintain` pass without hiding debt
  - future duplicate follow-ups reuse this lane through the canonical owner marker
  - CO-266 remains scoped to terminal-blocker advisory work
- Explicitly out-of-scope differences:
  - CO-266 terminal-blocker implementation or tests
  - freshness policy cap/window changes
  - broad archive/deletion work unrelated to the classified stale set

## Readiness Gate
- Not done if:
  - `docs:freshness` remains red on stale docs or the rolling freshness cohort
  - `docs:freshness:maintain` remains blocking for the current diff/baseline
  - CO-175 rolling debt is hidden instead of reviewed/current
  - any stale class named by the issue lacks evidence-backed review
  - CO-266 remains responsible for this maintenance sweep
- Pre-implementation issue-quality review evidence:
  - 2026-04-20: live issue context confirms CO-267 is `Ready` with no attached PR and no existing workpad; it was moved to `In Progress` before coding.
  - 2026-04-20: parent reproduction confirms the current exact baseline shape: `66` blocking stale docs, `221` CO-175 rolling rows, and stale active spec frontmatter rows.
  - 2026-04-20: the micro-task path is ineligible because correctness depends on protected wording, canonical owner reuse, policy visibility, and path-level review evidence.
  - 2026-04-21: Rework reset confirmed prior PR #566 was already merged. Current `origin/main` reproduced 37 stale Task Packet / Task Mirror rows, no rolling cohort rows, `docs:freshness:maintain=block_policy_over_budget`, and `blocking_changed_paths=0`; the rework patch owns only the reviewed Apr 21 packet/mirror metadata and evidence updates.
- Safeguard ownership split:
  - parent lane owns Linear state/workpad, docs packet, registry refresh, validation, PR lifecycle, and merge
  - same-issue child lane `freshness-baseline` successfully reproduced the baseline, but its patch was invalidated by live issue timestamp drift before accept; parent reran baseline reproduction and does not rely on an unaccepted child patch

## Technical Requirements
- Functional requirements:
  1. Capture before artifacts for `docs:freshness`, `docs:freshness:maintain`, and `spec-guard --dry-run`.
  2. Classify stale docs by class, path family, review date, lineage, and disposition.
  3. Classify stale active spec rows by path and disposition.
  4. Review and refresh or explicitly dispose of the CO-175 rolling freshness cohort before expiry.
  5. Add this packet and classification to task/index/freshness registry mirrors.
  6. Preserve the canonical owner marker so recurring baseline debt reuses CO-267.
- Non-functional requirements:
  - machine-checkable before/after artifacts under `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/`
  - minimal metadata/content changes needed for truthful freshness recovery
  - no new runtime dependencies
- Interfaces / contracts:
  - `docs/docs-freshness-registry.json` stores registry metadata for markdown docs
  - active specs under `tasks/specs/**` carry frontmatter `last_review` enforced by `spec-guard`
  - `docs/guides/docs-freshness-cohorts.md` documents rolling cohort ownership and reviewed refreshes
  - Linear `create-follow-up --canonical-owner-key docs:freshness:maintain` must be able to find this owner lane when needed

## Architecture & Data
- Architecture / design adjustments:
  - no script architecture change expected
  - use existing registry, spec frontmatter, and cohort guidance surfaces
  - use the classification finding as the review rationale for metadata refresh
- Data model changes / migrations:
  - add CO-267 packet and classification entries to `docs/docs-freshness-registry.json`
  - update selected existing registry rows after review
  - update selected spec frontmatter rows after review
  - update `docs/guides/docs-freshness-cohorts.md`, `tasks/index.json`, and `docs/TASKS.md`
- External dependencies / integrations:
  - Linear helper for workpad/state/PR attachment
  - no app runtime proof required

## Validation Plan
- Tests / checks:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `codex-orchestrator review` under `FORCE_CODEX_REVIEW=1`
- Rollout verification:
  - final after artifacts show `0` blocking stale docs, no invalid registry drift, and no stale active spec rows from the classified set
  - workpad records whether CO-175 rolling debt is gone or remains with a legitimate current owner action
- Monitoring / alerts:
  - future date-boundary candidates should cite or reuse the CO-267 canonical owner rather than expanding feature-lane scope

## Open Questions
- None currently.

## Approvals
- Reviewer: rework standalone review completed with `bounded-success`; evidence `.runs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/cli/2026-04-21T05-34-25-740Z-9cf43116/review/telemetry.json`.
- Date: 2026-04-21
