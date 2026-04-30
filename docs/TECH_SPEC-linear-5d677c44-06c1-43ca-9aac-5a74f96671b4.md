---
id: 20260430-linear-5d677c44-06c1-43ca-9aac-5a74f96671b4
title: "CO-431 canonical-owner docs freshness automation"
relates_to: docs/PRD-linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md
risk: high
owners:
  - Codex
last_review: 2026-04-30
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
---

# TECH_SPEC - CO-431 canonical-owner docs freshness automation

This mirror points to the canonical task spec at `tasks/specs/linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`.

## Canonical Reference
- PRD: `docs/PRD-linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`
- Canonical TECH_SPEC: `tasks/specs/linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`
- Task checklist: `tasks/tasks-linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`
- Agent mirror: `.agent/task/linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`
- Source anchor: `ctx:sha256:6ea763de1cb1d0b142323efe474f2c99ec0b6bf6c71fd265c1b4df04d2521dfd#chunk:c000001`

## Implementation Summary
- Make `docs:freshness:maintain` verify live owner state by exact canonical owner key before emitting create/update/replacement/noop decisions.
- Route `CO-428` stale active-spec, `CO-429` completed-lane registry residue, and `CO-430` terminal-owner replacement cases through distinct action evidence.
- Preserve `CO-188` and `CO-323` as escaped historical root-cause attempts, not active proof that the recurrence is closed.
- Emit dry-run/no-token copyable issue and update bodies without Linear mutation.
- Keep scheduled maintenance and provider-worker preflight paths on the same decision schema.

## Validation Contract
- Focused route tests for `CO-428`, `CO-429`, and `CO-430` maintenance decisions.
- Focused live-owner-state tests for open owner update, missing owner create, terminal owner replacement, and no-token/dry-run copyable output.
- Focused scheduled/preflight wiring checks that prove both paths consume the same `docs:freshness:maintain` decision.
- Parent-owned validation floor remains outside this docs-only child lane.
