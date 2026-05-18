---
id: 20260422-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a
title: "Maintain docs freshness rolling baseline for Apr 22 stale cohorts and registry drift"
status: done
relates_to: docs/PRD-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
related_action_plan: docs/ACTION_PLAN-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md
task_checklists:
  - tasks/tasks-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (26 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- PRD: `docs/PRD-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- Task checklist: `tasks/tasks-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- Source anchor: `ctx:sha256:e6e7135ed5c5dcc34ca04950403e7a9a88a5902d59c65a6241a8aba0924f7392#chunk:c000001`

## Summary
- Objective: register `CO-300` as the live Apr 22 owner lane for repo-wide docs freshness debt, missing-on-disk registry drift, and stale canonical-owner metadata.
- Scope:
  - docs-first packet and required mirror updates on the current branch
  - parent-owned Apr 22 before artifacts, classification, reviewed disposition, regression coverage, validation, and closeout
  - explicit preservation of `CO-295` as an unrelated blocked lane with `blocking_changed_paths=[]`
- Constraints:
  - parent owns all fixes to live hard-stale docs, Mar 22 cohorts, terminal-owner metadata, and review/PR flow
  - reject gate weakening, duplicate live canonical owners, and deletion-only cleanup

## Issue-Shaping Contract
- User-request translation carried forward: this lane is the Apr 22 stale-cohort and registry-drift owner for `docs:freshness:maintain`; it is not `CO-295` implementation work and not a reason to keep terminal owner metadata live.
- Protected terms / exact artifact and surface names:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `canonical owner`
  - `CO-175`
  - `CO-267`
  - `terminal owner metadata`
  - `blocking_changed_paths=[]`
  - `docs/codex-orchestrator-issues.md`
  - `missing-on-disk registry references`
  - `Mar 21/22 historical cohorts`
  - `current main`
  - `owner_issue=CO-175`
  - `owner_issue_action=update_existing`
  - `1317`
  - `1318`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Nearby wrong interpretations to reject:
  - `CO-295` should absorb this repo-wide maintenance debt
  - terminal owner issues can remain the live canonical owner
  - missing-on-disk rows or stale docs can be dropped without reviewed rationale
  - blind `last_review` bumps are an acceptable closeout
  - a second live canonical owner with the same marker is acceptable
- Explicit non-goals carried forward:
  - no `CO-295` code or PR-attachment behavior changes
  - no weakening of `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`
  - no widening into unrelated docs debt or policy redesign while handling the live Apr 22 baseline

## Parity / Alignment Matrix
- Current truth:
  - the original issue packet preserved an earlier snapshot of `4307` docs, `4316` registry entries, `53` stale docs total, and `6` missing-on-disk registry references, but fresh `2026-04-22` current-main reproduction is now `4390` docs, `4393` registry entries, `16` stale docs total, `0` missing-on-disk or invalid registry references, and one hard-stale path `docs/codex-orchestrator-issues.md`
  - `15` historical candidate entries remain across `6` candidate cohorts, concentrated in Mar 22 stale packets and mirrors including `1317`/`1318`
  - pre-fix `docs:freshness:maintain` still emitted `owner_issue=CO-175`, `owner_issue_action=update_existing`, and `blocking_changed_paths=[]`
  - `CO-295` remains blocked even though `blocking_changed_paths=[]`
- Reference truth:
  - `CO-175` is the original rolling owner and `CO-267` is the previous canonical owner, but both are terminal
  - prior owner lanes preserved date-boundary freshness truth by classification, reviewed disposition, and explicit owner metadata
  - the canonical owner marker should identify one live non-terminal owner issue
- Target truth / intended delta:
  - `CO-300` is registered as the live canonical `docs:freshness:maintain` owner
  - parent preserves the earlier missing-on-disk snapshot as historical issue context, resolves the live hard-stale doc and Mar 22 cohorts including `1317`/`1318`, and removes terminal-owner reuse from the maintenance path
  - `CO-295` can unblock without widening scope once the repo-wide owner lane lands
- Explicitly out-of-scope differences:
  - `CO-295` provider-linear workflow or PR-attachment logic
  - policy-cap/window changes or warning-only downgrade
  - unrelated historical cleanup beyond the Apr 22 owner lane

## Readiness Gate
- Not done if:
  - `docs:freshness:maintain` still resolves to a terminal owner issue
  - the live hard-stale doc, Mar 22 cohorts, or terminal-owner reuse remain with no explicit owner evidence, or the earlier missing-on-disk snapshot reappears without owned handling
  - the closeout hides `CO-175` / `CO-267` lineage or leaves `CO-295` blocked behind repo-wide debt while `blocking_changed_paths=[]`
  - the packet or mirrors omit the exact Apr 22 blocker shape
- Pre-implementation issue-quality review evidence:
  - 2026-04-22: live issue context already narrows the work to repo-wide freshness debt, missing-on-disk registry references, canonical-owner drift, and Mar 21/22 stale cohorts.
  - 2026-04-22: the micro-task path is ineligible because correctness depends on exact protected wording, exact surface names, and canonical-owner semantics.
- Safeguard ownership split:
  - the docs packet owns only the packet files plus `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - implementation, tests, findings, validation, workpad, Linear state, and PR lifecycle stay parent-owned

## Technical Requirements
- Functional requirements:
  1. Create the docs-first packet for `CO-300` and preserve the exact Apr 22 issue checksum.
  2. Register `CO-300` in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
  3. Make `CO-300` the live canonical `docs:freshness:maintain` owner in current registry truth.
  4. Parent must reproduce the Apr 22 baseline and save durable `docs:freshness` / `docs:freshness:maintain` artifacts.
  5. Parent must record that the earlier six missing-on-disk registry references no longer reproduce on current main, resolve hard-stale `docs/codex-orchestrator-issues.md`, and classify/process the live Mar 22 cohorts including `1317`/`1318`.
  6. Parent must add or update regression coverage so terminal owner issues cannot remain the live maintenance recommendation.
- Non-functional requirements:
  - machine-checkable owner transition and before/after evidence
  - minimal bounded changes inside existing freshness/catalog machinery
  - no hidden debt and no duplicate live canonical-owner markers
- Interfaces / contracts:
  - `docs/docs-freshness-registry.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `docs/docs-catalog.json`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `scripts/docs-freshness.mjs`
  - `scripts/docs-freshness-maintain.mjs`
  - `scripts/spec-guard.mjs`

## Architecture & Data
- Architecture / design adjustments:
  - no new policy or runtime surface is expected for the packet-registration step
  - the parent should prefer existing registry, catalog, cohort-guide, and maintenance-decision surfaces over new abstractions
  - historical lineage for `CO-175` and `CO-267` should remain visible while live ownership moves to `CO-300`
- Data model changes / migrations:
  - add the CO-300 packet rows to `docs/docs-freshness-registry.json`
  - update `docs/TASKS.md` and `tasks/index.json` so live canonical-owner registration points to CO-300
  - parent will decide any additional catalog/cohort metadata changes required by the reviewed repair
- External dependencies / integrations:
  - Linear mutation remains parent-owned
  - parent may reuse prior docs freshness owner-lane patterns from `CO-175`, `CO-239`, and `CO-267`

## Current Truth
- Live issue truth on 2026-04-22 is:
  - historical issue snapshot: `4307` docs, `4316` registry entries, `53` stale docs total, `6` registry references missing files
  - fresh current-main reproduction: `docs:freshness FAILED - 4390 docs, 4393 registry entries`
  - `16` stale docs total
  - `0` missing-on-disk or invalid registry references on current main
  - `1` hard-stale path: `docs/codex-orchestrator-issues.md`
  - `15` historical candidate entries across `6` candidate cohorts, including Mar 22 stale packets and mirrors
  - pre-fix `docs:freshness:maintain` emitted `owner_issue=CO-175`, `owner_issue_action=update_existing`, and `blocking_changed_paths=[]`
  - both `CO-175` and `CO-267` are already `Done`
  - `CO-295` is blocked even though `blocking_changed_paths=[]`

## Proposed Design
- Docs packet:
  - create the six packet files
  - add the CO-300 task entry
  - prepend a truthful `docs/TASKS.md` snapshot based on the refreshed current-main baseline
  - register the six new packet docs and touched mirror dates in the freshness registry
- Parent implementation:
  - capture before artifacts
  - preserve the earlier missing-on-disk drift snapshot as historical context and repair the live hard-stale docs
  - classify/process Mar 22 cohorts including `1317`/`1318`
  - re-home remaining canonical-owner metadata across policy, catalog, and maintenance surfaces
  - add regression coverage and rerun docs validation

## Protected Expectations
- Preserve exact wording around `docs:freshness`, `docs:freshness:maintain`, canonical owner, terminal owner metadata, `blocking_changed_paths=[]`, `docs/codex-orchestrator-issues.md`, missing-on-disk registry references, Mar 21/22 historical cohorts, and `current main`.
- Preserve exact lineage references to `CO-175`, `CO-267`, `CO-295`, `1317`, and `1318`.
- Preserve the truth that CO-300 is the new live canonical owner because prior owners are terminal, not because the policy changed.

## Reject These Wrong Interpretations
- `CO-295 should just fix the failing docs freshness debt.`
- `A Done owner issue can stay the live canonical owner.`
- `We can clear the counts by deleting rows or bumping dates without reviewed evidence.`
- `The Apr 22 blocker is just another diff-local failure.`

## Validation Plan
- Docs packet checks:
  - protected-term grep across packet and mirror files
  - `git diff --check` across touched files
  - JSON parse checks for `tasks/index.json` and `docs/docs-freshness-registry.json`
- Parent-lane checks:
  - before/after `npm run docs:freshness`
  - before/after `npm run docs:freshness:maintain`
  - `npm run docs:check`
  - focused regression coverage for terminal owner recommendation misuse
  - parent docs-review and follow-up review

## Open Questions
- Should the live Mar 22 historical cohorts be reviewed-refresh, archived, or partially reclassified now that the earlier missing-on-disk snapshot is non-repro on current main?
- Which catalog/policy surface still most directly owns the stale terminal-owner pointer after task-index registration moves to CO-300?

## Approvals
- Reviewer: pending parent docs-review and parent implementation.
- Date: 2026-04-22
