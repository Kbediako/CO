---
id: 20260214-0964-pr-watch-merge-cli-ship
title: PR Watch-Merge CLI Command
doc_type: tech_spec
relates_to: docs/PRD-pr-watch-merge-cli-ship.md
risk: medium
owners:
  - Codex
last_review: 2026-02-14
---

## Summary
- Objective: Ship PR monitor/quiet-window/auto-merge behavior as a native CLI command for npm/downstream users.
- Scope: command wiring, parity behavior, docs updates, tests, and validation evidence.
- Constraints: minimal diff and backward compatibility.

## Technical Requirements
- Functional requirements:
  - Add `codex-orchestrator pr watch-merge` command.
  - Support parity flags + `PR_MONITOR_*` env behavior.
  - Preserve existing `npm run pr:watch-merge` compatibility.
  - Update docs and skills to prefer shipped command.
- Non-functional requirements:
  - Non-interactive-safe behavior.
  - Clear errors and deterministic option parsing.
  - Keep command available in packaged npm artifact.
- Dependencies:
  - `gh` CLI availability/auth.
  - Existing monitor semantics currently in `scripts/pr-monitor-merge.mjs`.

## Review Notes
- Standalone pre-implementation review captured: `out/0964-pr-watch-merge-cli-ship/manual/pre-implementation-standalone-review.log` (2026-02-14).
