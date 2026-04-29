---
id: 20260429-linear-d78c6860-93f6-4936-b3ad-b40e8de8a566
title: "CO-427 re-home docs:freshness:maintain owner after terminal CO-425"
relates_to: docs/PRD-linear-d78c6860-93f6-4936-b3ad-b40e8de8a566.md
risk: high
owners:
  - Codex
last_review: 2026-04-29
---

# TECH_SPEC - CO-427 re-home docs:freshness:maintain owner after terminal CO-425

This mirror points to the canonical task spec at `tasks/specs/linear-d78c6860-93f6-4936-b3ad-b40e8de8a566.md`.

## Implementation Summary
- Reproduce the terminal owner blocker shape: `freshness_decision=block_unowned_repo_debt`, terminal `owner_issue=CO-425`, `configured_owner_terminal`, `state=Done`, `state_type=completed`, `usable=false`, and `blocking_changed_paths=[]`.
- Re-home the live rolling freshness owner metadata in `docs/docs-catalog.json` from terminal `CO-425` to active same-project `CO-427`.
- Update `docs/guides/docs-freshness-cohorts.md`, `tasks/index.json`, `docs/TASKS.md`, and the CO-427 packet/mirrors so they describe the active owner repair instead of future packet-only work.
- Preserve the existing March 28 cohort identity `co-420-apr-28-march-28-task-packet-mirror` without refreshing `last_review`, deleting evidence, archiving rows, reclassifying rows, or weakening freshness policy.

## Implementation Boundaries
- No source code, package, script, or test behavior changes.
- No CO-330 provider-worker behavior changes.
- No CO-408, CO-405, or shared-root dirty-file edits.
- No freshness policy weakening, cap expansion, registry deletion, stale-doc deletion, or blind review-date bump.

## Validation Contract
- Owner repair validation must show:
  - `docs/docs-catalog.json` names `CO-427` as `policies.rolling_freshness_cohorts.owner_issue`
  - `docs/guides/docs-freshness-cohorts.md` names `CO-427` as current owner and keeps `CO-425` as terminal historical evidence
  - `tasks/index.json`, `docs/TASKS.md`, and task mirrors describe the completed owner re-home
  - `docs:freshness:maintain -- --format json` reports `freshness_decision=pass_with_owned_rolling_debt`, `owner_issue=CO-427`, and `blocking_changed_paths=[]`
  - `npm run docs:freshness` passes with the retained rolling cohort still visible
