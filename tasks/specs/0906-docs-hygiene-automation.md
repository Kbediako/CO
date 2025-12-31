---
id: 20251215-docs-hygiene-automation
title: Docs Hygiene Automation & Review Handoff Gate
relates_to: Task 0906 (docs hygiene automation)
risk: low
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2025-12-15
---

## Summary
- Provide deterministic automation to keep agentic documentation self-consistent and up to date:
  - `docs:check` fails fast on broken references and stale workflow contracts.
  - `docs:sync` safely updates mirror outputs for the active task.
- Standardize that implementation work is not “complete” until guardrails and `npm run review` have run.

## Invariants
- `/tasks` remains the source of truth for task checklists and manifests; sync flows only propagate from `/tasks` → mirrors.
- `docs:sync` must not rewrite freeform docs like `README.md` unless content is explicitly marked as managed.
- `docs:sync` must be idempotent (re-running produces no changes).
- CI must be able to run `docs:check` without Codex authentication.

## Managed outputs
- `.agent/task/<task-id>.md` (active task only)
- `docs/TASKS.md` (active task’s snapshot entry only)

## Non-managed docs (check-only)
- `README.md`, `.agent/system/*`, `.ai-dev-tasks/*`, and other narrative docs remain human-authored, but should be linted for broken/stale references.

## Validation
- `npm run docs:check` passes locally and in CI.
- `npm run docs:sync -- --task <task-id>` is idempotent.

