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
- Create the prerequisite CO-427 packet and mirrors while the Linear issue remains in `Backlog`.
- Preserve the current maintenance blocker shape: `freshness_decision=block_unowned_repo_debt`, terminal `owner_issue=CO-425`, `configured_owner_terminal`, `state=Done`, `state_type=completed`, `usable=false`, and `blocking_changed_paths=[]`.
- Register the packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Keep the packet branch scoped to docs-first setup only; later active work owns live owner verification and any cohort maintenance path.

## Implementation Boundaries
- No source code, package, script, or test behavior changes.
- No CO-330 provider-worker behavior changes.
- No CO-408, CO-405, or shared-root dirty-file edits.
- No `docs/docs-catalog.json` or `docs/guides/docs-freshness-cohorts.md` changes in this packet-only PR.
- No freshness policy weakening, cap expansion, registry deletion, stale-doc deletion, or blind review-date bump.

## Validation Contract
- Packet setup must show:
  - all six CO-427 packet/mirror files exist
  - `tasks/index.json` contains `20260429-linear-d78c6860-93f6-4936-b3ad-b40e8de8a566`
  - `docs/docs-freshness-registry.json` contains the six packet paths
  - protected terms include `docs:freshness:maintain`, `docs:freshness`, `docs/docs-freshness-registry.json`, `docs/docs-catalog.json`, terminal `CO-425`, and canonical owner key `docs:freshness:maintain`
- Expected baseline owner evidence may still show:
  - `freshness_decision=block_unowned_repo_debt`
  - `owner_issue=CO-425`
  - `owner_issue_action.reason=configured_owner_terminal`
  - `owner_issue_verification.state=Done`
  - `owner_issue_verification.state_type=completed`
  - `blocking_changed_paths=[]`
- `npm run docs:freshness` and `npm run docs:check` should pass unless unrelated current-main debt is reported separately.
