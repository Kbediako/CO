---
id: 20260307-1036-coordinator-symphony-aligned-compatibility-issue-index-extraction
title: Coordinator Symphony-Aligned Compatibility Issue Presenter Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-compatibility-issue-index-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the compatibility-only issue presenter policy into a dedicated helper without changing the `1035` route behavior.
- Scope: compatibility aggregation/presenter extraction plus regression/manual evidence.
- Constraints: keep selected-run-only consumers on the current seam; avoid authority, scheduler, or provider-ingestion expansion.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1035`.
- Reasoning: `1035` fixed the behavior but concentrated the compatibility policy inside `observabilityReadModel.ts`; the smallest next improvement is to extract that policy into a dedicated compatibility presenter/helper module while preserving all route behavior.
- Initial review evidence: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/15-next-slice-note.md`, `docs/findings/1036-compatibility-issue-index-extraction-deliberation.md`.
- Delegation note: use a bounded Symphony-alignment review stream before implementation so the extraction boundary stays minimal and route-stable.
