---
id: 20260508-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675
title: CO-509 auto-created issue labels, relations, and traceability
relates_to: docs/PRD-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md
related_action_plan: docs/ACTION_PLAN-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md
risk: medium
owners:
  - Codex
last_review: 2026-05-08
---

## Summary
- Objective: Make provider-created Linear issue creation deterministic across labels, related links, and packet/mirror traceability.
- Scope: Same as `tasks/specs/linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md`.
- Constraints: Preserve existing queue semantics and fail closed instead of relying on manual cleanup.

## Issue-Shaping Contract
- User-request translation carried forward: Automatically created issues should be labelled properly and related issues should be linked; the queue audit adds packet/mirror traceability as a required part of readiness.
- Protected terms / exact artifact and surface names: `create-follow-up`, provider-created follow-ups, canonical-owner reuse, Linear labels, related issue link, Backlog, packet/mirror traceability.
- Nearby wrong interpretations to reject: Do not only update docs; do not silently skip relation repair after partial issue creation; do not let missing packet files or mirrors park Backlog without a clear blocker.
- Explicit non-goals carried forward: No WIP cap changes, provider-intake rewrite, label taxonomy redesign, or CO-512 governed review implementation.

## Requirements
- Created/reused follow-ups must expose label evidence, relation evidence, and packet/mirror readiness evidence or fail-closed details.
- Canonical-owner reuse must reconcile relations and labels even when an earlier creation attempt stopped after description-normalization drift.
- Packet/mirror readiness must cover PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent/task`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.

## Validation Plan
- Focused facade tests for labels, relations, canonical-owner reuse, partial creation recovery, and packet/mirror fail-closed behavior.
- Docs and registry validation: `npm run docs:check`, `npm run docs:freshness`, `node scripts/spec-guard.mjs --dry-run`.
- Review evidence must use `gpt-5.5` / `xhigh` unless a concrete access-failure waiver is recorded.
