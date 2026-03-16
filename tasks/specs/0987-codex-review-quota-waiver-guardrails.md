---
id: 20260302-0987-codex-review-quota-waiver-guardrails
title: Codex Review Quota + Merge Waiver Guardrails
relates_to: tasks/tasks-0987-codex-review-quota-waiver-guardrails.md
risk: low
owners:
  - Codex
last_review: 2026-03-02
---

## Summary
- Objective: add explicit quota-aware Codex review request and merge-waiver policy language.
- Scope: `AGENTS.md`, `docs/AGENTS.md`, `docs/guides/codex-version-policy.md`, and checklist/index mirrors.
- Constraints: docs-only, minimal diff, no behavior changes.

## Technical Requirements
- Functional requirements:
  - Add one-ping-per-head-SHA rule for manual `@codex` requests.
  - Add Codex quota exhaustion waiver conditions for merges.
  - Clarify quota exhaustion is an operational availability event.
  - Keep `AGENTS.md` and `docs/AGENTS.md` aligned.
- Non-functional requirements:
  - Policy text must be unambiguous and auditable.
  - Keep wording concise and low-maintenance.

## Validation Plan
- Run ordered quality lane and capture logs under `out/0987-codex-review-quota-waiver-guardrails/manual/`.

## Approvals
- Reviewer: Codex (self-approval, docs-first gate).
- Date: 2026-03-02.
