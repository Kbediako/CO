---
id: 20260421-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6
title: Control host refresh retained released/not_active claim metadata
relates_to: docs/PRD-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md
risk: high
owners:
  - Codex
last_review: 2026-04-21
---

This document mirrors the canonical TECH_SPEC at `tasks/specs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6-control-host-refresh-retained-released-not-active-claim-metadata.md`. Update the canonical spec first, then keep this mirror aligned for docs freshness and reviewer navigation.

## Summary
- Objective: refresh `issue_state`, `issue_state_type`, and `issue_updated_at` on retained `provider-intake-state.json` rows with `state=released` and `reason=provider_issue_released:not_active` when newer live same-issue Linear truth exists, even if the issue remains non-active.
- Scope: metadata-only retained released/not_active refresh in `providerIssueHandoff.ts` or existing helper seams, parent-owned source changes, focused regression coverage, and docs/review handoff.
- Constraints: no active-claim metadata refresh, no Ready reclaim/admission, no refresh-stuck restart recovery, no destructive cleanup of retained rows, and no unbounded direct issue-by-id reads over retained released residue.

## Canonical Sections
- Full user-request translation, protected terms, nearby wrong interpretations, current/reference/target parity matrix, technical requirements, validation plan, and open questions are in `tasks/specs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6-control-host-refresh-retained-released-not-active-claim-metadata.md`.
