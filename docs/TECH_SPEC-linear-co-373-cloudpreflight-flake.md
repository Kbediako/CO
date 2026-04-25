---
id: 20260425-linear-co-373-cloudpreflight-flake
title: CO-373 CloudPreflight fake Codex CLI test flake stabilization
relates_to: docs/PRD-linear-co-373-cloudpreflight-flake.md
risk: high
owners:
  - Codex
last_review: 2026-04-25
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-co-373-cloudpreflight-flake.md`
- PRD: `docs/PRD-linear-co-373-cloudpreflight-flake.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-co-373-cloudpreflight-flake.md`
- Task checklist: `tasks/tasks-linear-co-373-cloudpreflight-flake.md`

## Summary
- Objective: stabilize the CloudPreflight fake Codex CLI harness that is blocking archive and release Core Lane evidence.
- Scope: keep the implementation narrow to `orchestrator/tests/CloudPreflight.test.ts` unless source inspection proves `cloudPreflight.ts` needs a production fix.
- Validation: focused and CI-shaped CloudPreflight tests, followed by PR Core Lane and archive/release unblock evidence.

See the canonical task spec for the full issue-shaping contract, requirements, and validation plan.
