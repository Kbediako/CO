---
id: 20260418-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd
title: CO: reclaim / reclassify / re-admit plain released/not_active issues across Backlog -> Ready with a free slot
relates_to: docs/PRD-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---

# TECH_SPEC - CO: reclaim / reclassify / re-admit plain released/not_active issues across Backlog -> Ready with a free slot

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- PRD: `docs/PRD-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- Task checklist: `tasks/tasks-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- `.agent` mirror: `.agent/task/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`

## Traceability
- Linear issue: `CO-240` / `ddb81c93-87b2-4dff-b69b-33d7ae3c91cd`
- Shared source 0 anchor: `ctx:sha256:80949939d67126c2c2bb65ec2935ce53a96a87f8e4e7e3b5fd8ff2ecf48992d4#chunk:c000001`
- Source object id: `sha256:80949939d67126c2c2bb65ec2935ce53a96a87f8e4e7e3b5fd8ff2ecf48992d4`
- Origin manifest: `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd-co-240-docs-packet/cli/2026-04-18T05-23-04-716Z-7f3aae66/manifest.json`

## Summary
- Objective: reclaim / reclassify / re-admit an eligible plain `provider_issue_released:not_active` issue when live truth moves across `Backlog` and `Ready` and one free slot remains.
- Scope:
  - parent-owned reclaim/admission classification in existing control-host seams
  - parent-owned focused regression coverage for `Backlog` -> `Ready` re-admit with free slot / `max_allowed=3`
  - preservation of adjacent reclaim lanes and `CO-236` protected contract
  - retention of audit state in `provider-intake-state.json`
- Constraints:
  - reject `max-concurrency`, `manual-launch`, `stale-Blocked-only`, and generic `refresh-loop` reinterpretations
  - keep this child lane docs-only
  - leave shared registries and parent integration to the parent lane

## Protected Surfaces
- `CO-236`
- `Ready`
- `Backlog`
- `provider_issue_released:not_active`
- `provider-intake-state.json`
- free slot / `max_allowed=3`
- reclaim / reclassify / re-admit
- `fresh_discovery`
- `providerIssueHandoff.ts`
- `providerLinearWorkflowStates.ts`
- `co-status --format json`

## Validation Plan
- Parent-focused reclaim/admission regression for a plain released/not-active issue that returns from `Backlog` to `Ready`.
- Parent-focused free-slot regression showing re-admit with free slot / `max_allowed=3`.
- Parent-focused adjacent-invariant coverage for `CO-202`, `CO-203`, `CO-212`, and `CO-181` where applicable.
- Parent docs-review / spec-guard after patch import.

## Approvals
- Pre-implementation issue-quality review is recorded in the canonical task spec.
- Parent lane owns docs-review, implementation validation, and PR lifecycle after patch import.
