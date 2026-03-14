---
id: 20260314-1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction
title: Coordinator Symphony-Aligned Orchestrator Shared Cloud-Preflight Request Contract Extraction
status: in_progress
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md
related_tasks:
  - tasks/tasks-1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Shared Cloud-Preflight Request Contract Extraction

## Summary

Align the remaining duplicated cloud-preflight request contract between router and doctor after `1171` extracted the router-local assembly seam.

## Scope

- shared cloud-preflight request contract alignment
- preservation of caller-owned router and doctor behavior
- focused router/doctor regressions

## Out of Scope

- router fallback behavior changes
- doctor guidance wording changes
- `runCloudPreflight(...)` semantic changes
- executor/lifecycle refactors

## Notes

- 2026-03-14: Registered immediately after `1171` closed. The next truthful risk is cross-shell request-contract drift between router and doctor, not more router fallback work. Evidence: `docs/findings/1172-orchestrator-shared-cloud-preflight-request-contract-extraction-deliberation.md`.
- 2026-03-14: `docs-review` for the registration did not reach a diff-local review step; it failed at the pipeline delegation guard, so the docs-first packet carries an explicit override instead of a false approval. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T024101Z-docs-first/05-docs-review-override.md`.
