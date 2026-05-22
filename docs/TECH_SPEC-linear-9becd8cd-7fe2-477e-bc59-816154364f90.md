---
id: 20260429-linear-9becd8cd-7fe2-477e-bc59-816154364f90
title: "CO-423 restore docs freshness owner truth after terminal CO-409"
relates_to: docs/PRD-linear-9becd8cd-7fe2-477e-bc59-816154364f90.md
risk: high
owners:
  - Codex
last_review: 2026-04-29
---

# TECH_SPEC - CO-423 restore docs freshness owner truth after terminal CO-409

This mirror points to the canonical task spec at `tasks/specs/linear-9becd8cd-7fe2-477e-bc59-816154364f90.md`.

## Implementation Summary
- Create the CO-423 docs-first packet and task mirror docs for the post-merge `docs:freshness:maintain` owner-truth blocker.
- Preserve current evidence: `block_unowned_repo_debt`, `configured_owner_terminal`, `owner_issue=CO-409`, terminal `CO-409` `Done`, `blocking_changed_paths=[]`, `docs:freshness`, and `canonical owner key`.
- Preserve historical-only context: `owner_issue=CO-420`, `CO-420`, and `co-420-apr-28-march-28-task-packet-mirror`.
- Explicitly reject treating `CO-420` as current owner truth, treating terminal `CO-409` as usable live ownership, weakening docs freshness gates, deleting stale rows, or broadening this child lane into parent-owned files or lifecycle work.
- Keep `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, `tasks/index.json`, `docs/TASKS.md`, source code, package files, validation scripts, Linear state, workpad, PR lifecycle, and final validation parent-owned.

## Parent-Owned Implementation Boundaries
- Reproduce or inspect the current post-merge `docs:freshness:maintain` report as needed.
- Confirm `owner_issue=CO-409` is terminal `CO-409` `Done` and remains `configured_owner_terminal` evidence only.
- Confirm `owner_issue=CO-420` / `CO-420` is historical-only context and not current live owner truth.
- Repair `docs/docs-catalog.json` ownership metadata only after the live CO-423 owner path is verified.
- Update `docs/docs-freshness-registry.json`, `tasks/index.json`, and `docs/TASKS.md` only from the parent lane if registration or validation requires it.
- Run `npm run docs:freshness`, `npm run docs:freshness:maintain`, and any required docs/review gates after patch import.

## Child Validation Contract
- Child lane:
  - bounded docs packet and task mirror patch only
  - trailing-whitespace check on the six scoped files
  - protected-term check across the six scoped files
  - file-scope check that only the six declared files changed
  - no full repo validation suites
- Parent lane:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - any required `docs:check`, spec guard, registry/catalog, PR, and review lifecycle validation after patch import
