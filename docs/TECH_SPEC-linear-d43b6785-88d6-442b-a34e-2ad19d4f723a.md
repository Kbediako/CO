---
id: 20260409-linear-d43b6785-88d6-442b-a34e-2ad19d4f723a
title: CO: add recurring autonomous repo-wide stewardship audit and freshness upkeep beyond markdown docs surfaces
relates_to: docs/PRD-linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`
- PRD: `docs/PRD-linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`
- Task checklist: `tasks/tasks-linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`

## Traceability
- Linear issue: `CO-124` / `d43b6785-88d6-442b-a34e-2ad19d4f723a`
- Linear URL: https://linear.app/asabeko/issue/CO-124/co-add-recurring-autonomous-repo-wide-stewardship-audit-and-freshness

## Summary
- Objective: add a recurring tracked-file stewardship audit that covers the whole repo, emits reviewable per-surface decisions, and composes with the existing docs truthfulness/freshness lanes instead of replacing them.
- Scope:
  - bootstrap the `CO-124` docs-first packet and single workpad
  - add a repo-stewardship catalog plus audit command over `git ls-files`
  - classify tracked surfaces into `validate`, `update`, `delete`, or `retain_with_rationale`
  - add recurring automation that runs docs truth plus repo stewardship and publishes artifacts
  - capture one bounded same-project follow-up if the audit surfaces a real historical-residue cluster that should not land here
- Constraints:
  - no broad cleanup sweep
  - no weakening of `docs:check` or `docs:freshness`
  - no reopening `CO-75`, `CO-88`, or `CO-102` ownership

## Technical Requirements
- Functional requirements:
  - inventory tracked files via `git ls-files`
  - catalog every major repo surface class explicitly
  - emit a machine-checkable decision per tracked surface
  - publish JSON and markdown audit artifacts
  - fail closed on uncatalogued tracked surfaces
  - detect at least one non-doc-root action candidate from the current repo
- Non-functional requirements:
  - keep decisions deterministic and reviewable
  - avoid relying on file age alone for front-door truthfulness
  - keep implementation bounded enough for one reviewable diff
- Interfaces / contracts:
  - `package.json`
  - `.github/workflows/docs-truthfulness-weekly.yml`
  - `scripts/repo-stewardship-audit.mjs`
  - `docs/repo-stewardship-catalog.json`
  - `tests/repo-stewardship-audit.spec.ts`
  - existing docs truth surfaces (`docs/docs-catalog.json`, `scripts/docs-freshness.mjs`, `scripts/docs-hygiene.ts`)

## Execution Update 2026-04-09
- Current repo truth before implementation:
  - `scripts/lib/docs-helpers.js` inventories markdown roots plus root `README.md` / `AGENTS.md`
  - `scripts/docs-freshness.mjs` consumes that markdown/doc inventory
  - `.github/workflows/docs-truthfulness-weekly.yml` only runs `docs:freshness`
  - `docs/docs-catalog.json` is doc-surface specific and does not classify code/config/history surfaces
  - tracked `reference/**` and `archives/**` payloads exist without a repo-wide stewardship rationale contract
- Pre-implementation approval:
  - the issue is correctly shaped as a recurring stewardship contract lane, not a one-time cleanup pass or a docs-policy rewrite

## Architecture & Data
- Architecture / design adjustments:
  - introduce a repo-stewardship catalog parallel to the docs catalog, but scoped to tracked-file stewardship decisions rather than docs freshness metadata
  - use explicit path/glob rules with bounded local heuristics:
    - required package scripts
    - required workflow commands
    - historical-surface local README/rationale anchors
  - default uncatalogued tracked surfaces to `update` so drift cannot hide outside the catalog
  - keep README/public onboarding validation attached to the existing docs truth checks and weekly `docs:check`
- Data model changes / migrations:
  - add `docs/repo-stewardship-catalog.json`
  - add JSON report schema emitted by the new audit command
- External dependencies / integrations:
  - Git tracked-file inventory via `git ls-files`
  - GitHub Actions weekly automation
  - Linear follow-up creation for bounded out-of-scope residue

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollout verification:
  - capture initial repo-stewardship output proving non-doc-root action candidates exist
  - rerun after implementation to prove the new command and workflow wiring are active
  - create and link a bounded follow-up if historical residue remains out of scope
- Monitoring / alerts:
  - rely on the weekly workflow artifacts and step summary

## Open Questions
- After the stewardship catalog lands, which historical residue paths should remain `retain_with_rationale` and which should become follow-up cleanup work?

## Approvals
- Reviewer: pending
- Status: in progress
- Date: 2026-04-09
