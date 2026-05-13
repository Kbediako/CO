---
id: 20260410-linear-d3f1af87-57da-46ab-901d-75a6cc60420e
title: CO: restore current-main docs:freshness green baseline after CO-134 validation repair
relates_to: docs/PRD-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`
- PRD: `docs/PRD-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`
- Task checklist: `tasks/tasks-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`

## Traceability
- Linear issue: `CO-143` / `d3f1af87-57da-46ab-901d-75a6cc60420e`
- Linear URL: https://linear.app/asabeko/issue/CO-143/co-restore-current-main-docsfreshness-green-baseline-after-co-134
- Source issue: `CO-134` / `653a1d08-94a4-47e1-8f63-2232dcaf8f1e`
- Prior green baseline lane: `CO-63` / `a34ce3f3-8e78-40f7-aabd-9e510572323e`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: restore a truthful `docs:freshness` green baseline on current main by re-reviewing and refreshing the single March 10 packet cohort that aged out after the CO-63 green baseline.
- Scope:
  - register the `CO-143` docs-first packet and mirrors
  - run an audited `docs-review` child stream before implementation
  - audit the reproduced stale cohort and refresh its review metadata consistently across packet surfaces
  - rerun `docs:freshness` and enough downstream validation to prove the repaired tree advances past the former blocker
- Constraints:
  - keep the fix bounded to the reproduced stale cohort
  - do not reopen the CO-134 test/review-wrapper seam without new evidence
  - avoid introducing new freshness exceptions or waivers

## Technical Requirements
- Functional requirements:
  - `npm run docs:freshness` must pass on the repaired tree
  - the `119` stale entries reproduced on April 10 must be explained as one coherent drift source
  - the March 10 packet cohort must have refreshed metadata that matches a truthful current review
  - downstream proof must show the repaired tree no longer stops first at `docs:freshness`
- Non-functional requirements (performance, reliability, security):
  - keep the repair deterministic and repo-local
  - preserve existing validation gate semantics
  - avoid broad docs churn outside the stale cohort
- Interfaces / contracts:
  - `scripts/docs-freshness.mjs`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
  - packet-local frontmatter fields such as `last_review`

## Architecture & Data
- Architecture / design adjustments:
  - classify the stale set from the saved repro report and treat it as a cohort-level metadata refresh problem rather than a missing-registry or invalid-entry problem
  - refresh packet review metadata consistently across registry rows, task index rows, and packet frontmatter where present
- Data model changes / migrations:
  - none; the lane updates review metadata only
- External dependencies / integrations:
  - `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/docs-freshness.json`
  - `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-co-134-implementation-gate-final/cli/2026-04-10T00-58-50-770Z-94dcc609/manifest.json`
  - `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-co-134-implementation-gate-final/cli/2026-04-10T00-58-50-770Z-94dcc609/commands/07-docs-freshness.ndjson`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - `npm run docs:freshness`
  - repo validation floor if the final diff is non-trivial
  - bounded proof that the repaired tree no longer stops first at `docs:freshness`
- Rollout verification:
  - the reproduced stale cohort is reduced from `119` to `0`
  - the closeout records that every stale entry had `last_review=2026-03-10` and `cadence_days=30`
  - the repaired tree advances beyond `docs:freshness`
- Monitoring / alerts:
  - rely on saved repro artifacts, the refreshed registry, and rerun validation logs

## Open Questions
- Whether the best downstream proof is a full `implementation-gate` rerun or a narrower validation sequence that still demonstrates the blocker moved.

## Approvals
- Reviewer: docs-review child stream failed only on the pre-existing `119`-stale-doc baseline; manual fallback accepted in `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T053642Z-docs-review-fallback.md`
- Date: 2026-04-10
