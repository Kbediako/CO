---
id: 20260418-linear-a710d9a7-5187-414d-8a8b-beab7853e446
title: "CO workflow: restore Apr 18 docs:freshness baseline for Mar 18 stale cohort"
relates_to: docs/PRD-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- PRD: `docs/PRD-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- Task checklist: `tasks/tasks-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`

## Traceability
- Linear issue: `CO-239` / `a710d9a7-5187-414d-8a8b-beab7853e446`
- Source anchor: `ctx:sha256:0d82ad4fdf8297fae69d0937a0588fb2976cb0c927eb468ec132a5ff9c789318#chunk:c000001`
- Docs packet child lane manifest: `.runs/linear-a710d9a7-5187-414d-8a8b-beab7853e446-docs-packet/cli/2026-04-18T04-39-54-760Z-8c9db8b8/manifest.json`
- Shared source note: the shared source text is run metadata only, so this packet preserves the live read-only CO-239 issue wording and counts from the parent-owned issue cache.

## Summary
- Objective: restore the Apr 18 docs:freshness baseline for the Mar 18 `1289-1298` historical packet cohort without weakening freshness policy or hiding CO-175 rolling debt.
- Scope:
  - docs-first packet for `CO-239`
  - parent-owned reproduction, classification, disposition, registry and cohort-guide updates, and validation
  - explicit preservation of the CO-175 rolling freshness cohort and the `repo-wide freshness debt` versus `per-PR diff health` boundary
- Constraints:
  - child lane edits only the six packet files
  - parent owns registry mirrors, workpad, `out/` artifacts, validation, and PR lifecycle
  - reject blind `last_review` bumps, policy-cap changes, or reopening CO-175

## Issue-Shaping Contract
- User-request translation carried forward: this lane is a bounded Apr 18 baseline-repair issue for the Mar 18 historical packet family, not a policy redesign and not a feature-lane drift issue.
- Protected terms / exact artifact and surface names:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `spec-guard`
  - `CO-175`
  - `rolling freshness cohort`
  - `repo-wide freshness debt`
  - `per-PR diff health`
  - `Mar 18 cohort`
  - `Task Packet`
  - `Task Mirror`
  - `Report Only`
  - `machine-checkable evidence`
  - `last_review=2026-03-18`
  - `1289-1298`
  - `70` blocking stale rows
  - `221` rolling cohort entries
  - `docs/docs-freshness-registry.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
- Nearby wrong interpretations to reject:
  - reopen or rewrite `CO-175`
  - hide the `221` rolling rows
  - widen rolling caps or windows to pass Apr 18
  - solve the cohort with a blind date bump
  - treat this as active feature-lane drift
  - weaken freshness or provider-worker handoff policy
- Explicit non-goals carried forward:
  - no CO-175 product-scope reopen
  - no rolling-cap or window change
  - no warning-only downgrade of `docs:freshness`
  - no unrelated historical cleanup beyond the Mar 18 blocker
  - no implementation or validation edits in this child lane

## Parity / Alignment Matrix
- Current truth:
  - clean current `main` fails `docs:freshness` with `70` blocking stale rows and `221` still-visible CO-175 rolling rows
  - all new blocking rows are `last_review=2026-03-18` and belong to the `1289-1298` historical packet family
  - the class split is `Task Packet=50`, `Task Mirror=10`, `Report Only=10`
  - missing or invalid registry drift remains zero
  - `docs/guides/docs-freshness-cohorts.md` documents repairs only through Apr 17
- Reference truth:
  - after `CO-209`, the repo had `0` blocking stale rows and only the `221` CO-175 rolling advisory
  - prior rollover lanes preserved visible CO-175 ownership while repairing new date-boundary blocking cohorts
  - repo-wide freshness debt should remain explicit and should not be silently shifted into unrelated feature validation
- Target truth / intended delta:
  - the Mar 18 `1289-1298` cohort gets an explicit reviewed owner action
  - `docs:freshness` returns to `0` blocking stale rows for unrelated clean diffs
  - the `221` CO-175 rolling rows remain visible and unchanged
  - the Apr 18 owner and disposition remain machine-checkable
- Explicitly out-of-scope differences:
  - reopening CO-175
  - policy-cap or window changes
  - broader historical cleanup outside the Mar 18 blocking cohort
  - child-lane registry or validation ownership

## Readiness Gate
- Not done if:
  - the Mar 18 `1289-1298` cohort still blocks `docs:freshness` with no explicit owner action
  - the fix depends on broader rolling eligibility or cap changes
  - the closeout hides CO-175 rolling debt
  - the packet fails to preserve class, path-family, and lineage truth for the Apr 18 blocker
- Pre-implementation issue-quality review evidence:
  - 2026-04-18: the live issue body already narrows this to one coherent historical packet family and explicitly rejects blind review-date bumps, policy-cap changes, and reopening CO-175.
  - 2026-04-18: the micro-task path is ineligible because correctness depends on exact protected wording, explicit non-goals, and the parity contract between repo-wide freshness debt and per-PR diff health.
- Safeguard ownership split:
  - child lane owns only `docs/PRD-*`, `docs/TECH_SPEC-*`, `docs/ACTION_PLAN-*`, `tasks/specs/*`, `tasks/tasks-*`, and `.agent/task/*` for this task id
  - parent lane owns `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `docs/guides/docs-freshness-cohorts.md`, `out/` artifacts, validation, Linear/workpad state, and PR lifecycle

## Technical Requirements
- Functional requirements:
  1. Create the docs-first packet for `CO-239` and preserve the exact Apr 18 / Mar 18 issue checksum.
  2. Parent must reproduce the Apr 18 `docs:freshness` failure on clean current `main` and save before artifacts under `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/`.
  3. Parent must classify the `70` blocking stale rows by class, path family, lineage, and disposition, including explicit relation to the `221` visible CO-175 rolling rows.
  4. Parent must choose a reviewed refresh, archive, reclassification, or other explicit owner action for the Mar 18 cohort without weakening `docs:freshness`.
  5. Parent must restore a truthful green `docs:freshness` path for unrelated clean diffs while keeping repo-wide freshness debt visible.
  6. Parent must update cohort guidance and owner evidence so later lanes can cite the Apr 18 owner.
- Non-functional requirements:
  - machine-checkable evidence for before and after state
  - no hidden policy dilution
  - minimal bounded parent implementation inside existing docs freshness machinery
  - preserved distinction between `repo-wide freshness debt` and `per-PR diff health`
- Interfaces / contracts:
  - `docs/docs-freshness-registry.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `scripts/docs-freshness.mjs`
  - `scripts/docs-freshness-maintain.mjs`
  - `scripts/spec-guard.mjs`

## Architecture & Data
- Architecture / design adjustments:
  - no new policy surface is expected for the child lane
  - the parent should prefer the existing freshness registry, cohort-guide, and maintenance-report surfaces over new abstractions
  - the parent should keep CO-175 provenance intact and handle the Mar 18 cohort as a separate explicit owner action
- Required artifact and content expectations:
  - before report capturing `70` blocking stale rows and `221` rolling rows
  - classification artifact covering `Task Packet`, `Task Mirror`, and `Report Only`
  - parent-owned disposition evidence tied to lineage `1289-1298`
  - after evidence showing whether any stale-looking historical packets remain intentionally visible
- Data model changes / migrations:
  - no schema change is expected from this child lane
  - parent should prefer existing registry or guidance fields unless current evidence proves a new owner field is necessary
- External dependencies / integrations:
  - no Linear mutation from this child lane
  - parent may reuse prior rollover patterns from `CO-184`, `CO-201`, and `CO-209`

## Current Truth
- Live verification on clean `main` recorded in the issue body reports `docs:freshness FAILED - 4071 docs, 4074 registry entries`.
- The current blocker is `70` blocking stale rows plus `221` CO-175 rolling rows.
- The new blocking rows are one coherent Mar 18 cohort:
  - classes: `Task Packet=50`, `Task Mirror=10`, `Report Only=10`
  - path families: `.agent/task` (`10`), `docs/ACTION_PLAN-*` (`10`), `docs/findings` (`10`), `docs/PRD-*` (`10`), `docs/TECH_SPEC-*` (`10`), `tasks/specs` (`10`), `tasks/tasks-*` (`10`)
  - lineage/tasks: `1289-1298`
- The live issue evidence also says missing or invalid drift is zero and that no Apr 18 packet or classification artifact exists yet.

## Proposed Design
- Parent should treat this as another date-boundary baseline-repair lane:
  - capture before artifacts
  - classify the Mar 18 cohort
  - pick the smallest truthful disposition
  - update parent-owned registry and cohort-guide surfaces only if required by that disposition
  - rerun freshness proof without weakening the existing policy
- Parent should keep CO-175 separate by leaving the `221` Mar 14 rolling rows visible and unchanged while resolving or explicitly re-owning the Mar 18 blocker.

## Protected Expectations
- Preserve exact issue wording around `docs:freshness`, `CO-175`, `rolling freshness cohort`, `repo-wide freshness debt`, `per-PR diff health`, `Mar 18 cohort`, `Task Packet`, `Task Mirror`, `Report Only`, and `machine-checkable evidence`.
- Preserve the live blocker shape: `70` blocking stale rows, `221` rolling rows, lineage `1289-1298`.
- Preserve explicit rejection of blind `last_review` bumps, policy-cap changes, and reopening CO-175.
- Preserve the child and parent ownership split.

## Reject These Wrong Interpretations
- `This is just another CO-175 tweak.`
- `Hide the rolling rows so Apr 18 passes.`
- `Solve the blocker with a mass date bump and no reviewed classification.`
- `Raise the rolling caps or window because the historical packet family is coherent.`
- `Treat repo-wide freshness debt as active feature-lane drift.`

## Validation Plan
- Child-lane checks:
  - protected-term grep across the six touched packet files
  - `git diff --check` over the six touched packet files
- Parent-lane checks:
  - before `npm run docs:freshness`
  - before `npm run docs:freshness:maintain` when needed for maintenance proof
  - classification artifact for the Mar 18 cohort
  - `node scripts/spec-guard.mjs --dry-run` when the parent touches active spec freshness metadata
  - `npm run docs:check`
  - `npm run docs:freshness`
  - parent docs-review before implementation
  - parent standalone review or explicit fallback after changes
  - parent elegance or minimality pass before handoff

## Approvals
- Reviewer: pending parent docs-review and parent implementation.
- Date: 2026-04-18
