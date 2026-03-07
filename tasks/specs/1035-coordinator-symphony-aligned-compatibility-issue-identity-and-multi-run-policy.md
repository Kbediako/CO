---
id: 20260307-1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy
title: Coordinator Symphony-Aligned Compatibility Issue Identity and Multi-Run Policy
relates_to: docs/PRD-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: make the compatibility `state` / `issue` surface explicitly issue-centered when multiple runs contribute to the same task or issue identifier.
- Scope: bounded multi-run discovery, compatibility identity policy, alias handling, and regression/manual evidence.
- Constraints: keep the selected-run seam current-run-only for UI/Telegram, keep `/api/v1/dispatch` separate, and avoid scheduler/authority expansion.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1034`.
- Reasoning: `1034` solved sibling runtime discovery and compatibility issue fanout, but it still relies on “latest readable run per task” heuristics. The smallest next tightening is to define explicit same-issue multi-run policy while preserving the selected-run/UI/Telegram boundary.
- Initial review evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/15-next-slice-note.md`, `docs/findings/1035-compatibility-issue-identity-and-multi-run-policy-deliberation.md`.
- Delegation note: use a bounded Symphony-alignment research stream before implementation so any identifier-policy mismatch is corrected before coding.
