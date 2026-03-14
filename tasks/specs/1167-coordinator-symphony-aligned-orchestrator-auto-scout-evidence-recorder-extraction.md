---
id: 20260314-1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction
title: Coordinator Symphony-Aligned Orchestrator Auto-Scout Evidence Recorder Extraction
status: completed
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md
related_tasks:
  - tasks/tasks-1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Auto-Scout Evidence Recorder Extraction

## Summary

Extract the remaining class-local auto-scout evidence recorder cluster from `CodexOrchestrator` into one adjacent helper/service.

## Scope

- `runAutoScout(...)` extraction
- merged env + timeout + evidence write + normalized outcome shaping
- focused helper coverage
- retained orchestration integration coverage

## Out of Scope

- `start()` / `resume()` lifecycle behavior
- execution routing changes
- auto-scout policy changes
- manifest ownership changes

## Notes

- 2026-03-14: Registered after `1166` completed. The next truthful seam is the class-local auto-scout recorder, not another public lifecycle micro-slice. Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/14-next-slice-note.md`, `docs/findings/1167-orchestrator-auto-scout-evidence-recorder-extraction-deliberation.md`.
- 2026-03-14: Pre-implementation local read-only review approved for docs-first registration. The recommended boundary is the merged-env timeout resolution + evidence write + normalized `recorded|timeout|error` outcome cluster currently owned by `runAutoScout(...)`. Evidence: `docs/findings/1167-orchestrator-auto-scout-evidence-recorder-extraction-deliberation.md`.
- 2026-03-14: Completed. `runAutoScout(...)` now delegates to `recordOrchestratorAutoScoutEvidence(...)`, focused recorder coverage includes the cloud-fallback-requested branch, and the lane closed with deterministic validation green. Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/00-summary.md`, `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/05-test.log`, `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/05b-targeted-tests.log`, `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/05c-docs-hygiene-targeted.log`.
- 2026-03-14: Explicit closeout overrides remain limited to stacked-branch diff budget plus review/docs-review wrapper drift after the repaired tree stopped producing concrete diff-local findings. Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/13-override-notes.md`.
