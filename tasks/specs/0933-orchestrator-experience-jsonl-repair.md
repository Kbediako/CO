---
id: 20260105-experience-jsonl-repair
title: ExperienceStore JSONL Line Repair
relates_to: docs/PRD-orchestrator-experience-jsonl-repair.md
risk: low
owners:
  - Codex (top-level agent)
last_review: 2026-01-05
---

## Summary
- Objective: Preserve JSONL line boundaries when appending new experiences.
- Constraints: Avoid full-file reads; keep append-only performance.

## Proposed Changes
- Architecture / design adjustments:
  - Add a tail newline check before appending new JSONL records.
- Data model updates:
  - None.
- External dependencies:
  - None.

## Impact Assessment
- User impact: Improves reliability of experience retrieval after partial writes.
- Operational risk: Low; limited to small file I/O changes.
- Security / privacy: No impact.

## Rollout Plan
- Prerequisites: Diagnostics + RLM evidence recorded.
- Testing strategy: Unit test for partial trailing line append behavior.
- Launch steps: Merge after implementation-gate success.

## Open Questions
- Should we add compaction for malformed tails in a follow-up?

## Approvals
- Reviewer:
- Date:
