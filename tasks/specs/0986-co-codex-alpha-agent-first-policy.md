---
id: 20260227-0986-co-codex-alpha-agent-first-policy
title: CO Codex Alpha Agent-First Policy
relates_to: docs/PRD-co-codex-alpha-agent-first-policy.md
risk: medium
owners:
  - Codex
last_review: 2026-02-27
---

## Summary
- Objective: ensure every agent in CO can immediately follow a safe Codex alpha policy.
- Scope: handbook policy sections, canonical guide, and mirror/index updates.
- Constraints: keep policy explicit, minimal, and evidence-driven.

## Technical Requirements
- Functional requirements:
  - Add a CO Codex version policy section to `AGENTS.md`.
  - Add matching policy section to `docs/AGENTS.md`.
  - Add `docs/guides/codex-version-policy.md` with cadence and rollback rules.
  - Update checklists/index/task snapshot for traceability.
- Non-functional requirements:
  - Policy text must be precise and unambiguous for agents.
  - Must preserve global-stable default unless explicitly promoted.

## Validation Plan
- Run ordered 1-10 quality lane and capture logs under task out dir.

## Approvals
- Reviewer: Codex (self-approval, docs-first gate).
- Date: 2026-02-27.
