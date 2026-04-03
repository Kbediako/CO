---
id: 20260403-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80
title: CO: Automate docs truthfulness and relevance across README, shipped skills, and agent-facing docs
relates_to: docs/PRD-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md
risk: high
owners:
  - Codex
last_review: 2026-04-03
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`
- PRD: `docs/PRD-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`
- Task checklist: `tasks/tasks-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`

## Traceability
- Linear issue: `CO-75` / `27ac1e64-d88c-4add-b2f4-f4908cb63e80`
- Linear URL: https://linear.app/asabeko/issue/CO-75/co-automate-docs-truthfulness-and-relevance-across-readme-shipped

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make front-door, agent-facing, shipped-skill, and seeded-template docs fail fast when they drift from the live CO posture or bundled skill tree, while keeping weekly reporting class-separated and readable.
- Scope:
  - docs-first registration for `CO-75`
  - checked-in docs catalog/config with explicit classes and pattern rules
  - blocking truthfulness checks inside `docs:check`
  - class-separated `docs:freshness` reporting
  - weekly artifact automation
  - bounded doc alignment for stale front-door and shipped docs
- Constraints:
  - preserve existing structural hygiene and freshness behavior
  - keep the gate deterministic and auditable
  - avoid a wholesale README redesign

## Technical Requirements
- Functional requirements:
  - classify documentation surfaces into meaningful classes such as front door, agent facing, active guide, shipped skill, shipped support, seeded template, task packet, task mirror, and archive
  - persist audience, source of truth, owner, cadence, update triggers, and tier in the catalog or its resolved policy
  - make `docs:check` blocking for tier-1/front-door/shipped surfaces on:
    - stale Codex posture references versus `docs/guides/codex-version-policy.md`
    - bundled skill roster drift versus the `skills/` tree
    - README front-door budget drift
  - keep `docs:freshness` reporting broad, but emit class-separated totals and failures
  - keep task packets, mirrors, and archives visible without letting them bury front-door/shipped failures
  - add a weekly workflow that uploads the class-separated report artifact
- Non-functional requirements:
  - deterministic local execution only
  - low-maintenance config that handles historical packet volume through patterns
  - stable JSON output for later automation and review consumption
- Interfaces / contracts:
  - `scripts/docs-hygiene.ts`
  - `scripts/docs-freshness.mjs`
  - `scripts/lib/docs-helpers.js`
  - `docs/docs-catalog.json`
  - `package.json`
  - `.github/workflows/*.yml`

## Architecture & Data
- Architecture / design adjustments:
  - add shared catalog resolution helpers consumed by both docs gates
  - use explicit entries for high-signal surfaces and pattern rules for large historical families
  - keep the blocking truthfulness gate inside `docs:check` so CI and local review paths do not split
  - treat README as the user-facing bundled-skill roster source unless a more specific canonical source is introduced in the same lane
- Data model changes / migrations:
  - introduce `docs/docs-catalog.json`
  - enrich `docs-freshness` report with class summaries, per-class failures, and uncatalogued surfaces
  - no migration for historical docs beyond catalog pattern classification
- External dependencies / integrations:
  - GitHub Actions artifact upload for weekly docs drift reporting

## Validation Plan
- Tests / checks:
  - child `docs-review` manifest for this task id
  - focused docs-gate tests for stale posture, roster drift, README budget drift, and class-separated reporting
  - required repo validation floor plus `pack:smoke`
- Rollout verification:
  - README, `docs/README.md`, `AGENTS.md`, `docs/AGENTS.md`, active guide coverage, shipped skills, and seeded templates are catalogued
  - aligned live docs pass the new blocking checks
  - workflow artifact contains the enriched `docs-freshness.json`
- Monitoring / alerts:
  - CI and weekly workflow outputs remain the operational signal

## Open Questions
- Whether the catalog should own cadence metadata outright in a later lane and replace the flat freshness registry. This lane keeps the existing registry alive and adds the catalog without weakening the current gate.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-03
