---
id: 20260422-linear-61ddd0d1-664b-4060-949b-33eb4e7255ac
title: "CO-297 stop-hook structured sentinel contract"
relates_to: docs/PRD-linear-61ddd0d1-664b-4060-949b-33eb4e7255ac.md
risk: medium
owners:
  - Codex
last_review: 2026-04-22
---

# TECH_SPEC - CO-297 stop-hook structured sentinel contract

This mirror points to the canonical task spec at `tasks/specs/linear-61ddd0d1-664b-4060-949b-33eb4e7255ac.md`.

## Implementation Summary
- Replace whole-message substring stop detection with final-line structured stop detection.
- Use `CO_ORCHESTRATOR_STOP: <sentinel>` as the deliberate stop-control line.
- Keep `CO_ORCHESTRATOR_DONE`, `CO_ORCHESTRATOR_CRITICAL_BLOCKER`, and `CO_ORCHESTRATOR_DESTRUCTIVE_DECISION_REQUIRED` as the only accepted sentinel values in the structured control line.
- Preserve fail-open behavior and normal resume prompting when no structured stop line is present.
- Keep the global hook scoped to the configured repo root path boundary, not sibling paths that share the same string prefix.
- Add focused tests that invoke the Python hook with an isolated temp state path.

## Validation Contract
- False read-only or `approval_policy=never` mentions of `CO_ORCHESTRATOR_CRITICAL_BLOCKER` keep `enabled=true`.
- Quoted or explanatory sentinel text keeps `enabled=true`.
- A final `CO_ORCHESTRATOR_STOP: CO_ORCHESTRATOR_CRITICAL_BLOCKER` line persists `enabled=false`.
- A final `CO_ORCHESTRATOR_STOP: CO_ORCHESTRATOR_DONE` line persists `enabled=false`.
- A final `CO_ORCHESTRATOR_STOP: CO_ORCHESTRATOR_DESTRUCTIVE_DECISION_REQUIRED` line persists `enabled=false`.
- A sibling cwd such as `<repo>-archive` does not receive the CO resume block or mutate the state file.
- The installed hook matches the repo-owned source after sync.
