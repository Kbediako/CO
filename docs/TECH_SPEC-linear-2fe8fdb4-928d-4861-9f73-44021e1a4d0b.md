---
id: linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b
title: CO-551 operator-confirmed quota-hygiene stale-process remediation
relates_to: docs/PRD-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md
risk: high
owners:
  - Codex
last_review: 2026-05-22
related_action_plan: docs/ACTION_PLAN-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md
task_checklists:
  - tasks/tasks-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md
---

# TECH_SPEC - CO-551 operator-confirmed quota-hygiene stale-process remediation

## Canonical Reference
- PRD: `docs/PRD-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`
- TECH_SPEC canonical: `tasks/specs/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`
- Task checklist: `tasks/tasks-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`
- Linear issue: `CO-551` / `2fe8fdb4-928d-4861-9f73-44021e1a4d0b`
- Source anchor: `ctx:sha256:7d0b516fef794941c1aec9537d1ecb0a177327a9c0ce84e01c46d2d1efa423e4#chunk:c000001`
- Canonical owner key: `quota-hygiene:operator-confirmed-stale-process-remediation:v1`

This file mirrors the canonical TECH_SPEC in `tasks/specs/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md` for docs navigation. The canonical spec owns the remediation-only contract: CO-542 remains detection/reporting only, operator confirmation is explicit, targets are scoped by current-audit PID eligibility, durable per-PID audit output is required, and the lane rejects automatic kill/restart, app-server/control-host restarts, provider-intake mutation, model calls, and kill-by-name behavior. It also requires summary truthfulness: process signaling is separate from artifact writing, `mode=applied` requires an actual delivered signal outcome, `mode=no_action` represents confirmed apply with no process action after revalidation/refusal, final artifact write failure clears `audit_artifact_path`, explicit `--remediation-output` is honored for preflight evidence, and stale `gh pr view` polling is remediation-detectable without being model-quota-burning by default.
