---
id: 20260422-linear-d9c8d1b2-3b38-42ef-9087-556870e2d88f
title: "CO: define preserved historical task-stub status semantics without triggering freshness or archive automation"
relates_to: docs/PRD-linear-d9c8d1b2-3b38-42ef-9087-556870e2d88f.md
risk: high
owners:
  - Codex
last_review: 2026-04-22
---

# TECH_SPEC - CO: define preserved historical task-stub status semantics without triggering freshness or archive automation

This mirror points to the canonical task spec at `tasks/specs/linear-d9c8d1b2-3b38-42ef-9087-556870e2d88f.md`.

## Implementation Summary
- Preserve CO-311 as the bounded preserved historical task-stub semantics follow-up created after CO-308 exposed the `active` versus `archived` status-model gap.
- Keep the example surface `tasks/tasks-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md` authoritative in the packet without recreating missing Apr 21 historical packet files.
- Keep parent implementation bounded to the truthful representation for preserved historical task-key stubs across `docs/docs-freshness-registry.json`, `scripts/docs-freshness.mjs`, and `scripts/implementation-docs-archive.mjs`.
- Do not reopen CO-308, do not silently archive preserved stubs, and do not weaken docs-freshness or archive automation broadly.

## Protected Surfaces
- `tasks/tasks-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- `docs/docs-freshness-registry.json`
- `scripts/docs-freshness.mjs`
- `scripts/implementation-docs-archive.mjs`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs:freshness:maintain`
- `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Parent-Owned Follow-On
- Define the truthful preserved-stub status model, including authoritative-for-tooling versus archive-eligible behavior.
- Align freshness and archive tooling to that contract without broad policy redesign.
- Preserve the bounded example and explicit non-goals from CO-311.
- Capture parent docs-review and parent-owned source validation before handoff.

## Validation Contract
- Child lane:
  - bounded docs packet and registry mirror patch artifact only
  - JSON parse checks for edited registries
  - scoped `git diff --check` and touched-file diff review
  - no full repo validation suites
- Parent lane:
  - docs-review before tooling/docs source edits
  - focused tooling/docs validation for preserved historical stubs
  - normal parent-owned review and PR lifecycle
