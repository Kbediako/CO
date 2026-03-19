---
id: 20260314-1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction
title: Coordinator Symphony-Aligned Orchestrator Cloud Route Fallback Contract Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md
related_tasks:
  - tasks/tasks-1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Cloud Route Fallback Contract Extraction

## Summary

Extract the bounded cloud-route fallback contract still shaped inline in `orchestratorCloudRouteShell.ts`.

## Scope

- cloud fallback allow/deny policy parsing
- preflight-failure contract shaping
- fallback reroute payload assembly for the fallback-to-`mcp` path
- focused regressions for fail-fast behavior, fallback contract shaping, and reroute payload assembly

## Out of Scope

- successful cloud preflight dispatch wiring
- cloud preflight request assembly
- router-local route-state resolution and branch selection
- local-route shell
- broader cloud target executor lifecycle behavior

## Notes

- 2026-03-14: Registered immediately after `1182` closed. The next truthful remaining routing seam is the cloud-route fallback contract cluster still embedded in `orchestratorCloudRouteShell.ts`, not another router or executor refactor. Evidence: `docs/findings/1183-orchestrator-cloud-route-fallback-contract-extraction-deliberation.md`, `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/14-next-slice-note.md`.
- 2026-03-14: Local read-only review approval for the docs-first packet is captured in the deliberation note and mirrored checklist. Evidence: `docs/findings/1183-orchestrator-cloud-route-fallback-contract-extraction-deliberation.md`, `tasks/tasks-1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md`.
- 2026-03-14: `docs-review` did not reach a diff-local review step for the registration packet; the pipeline failed at `Run delegation guard`, so the docs-first lane records an explicit override backed by direct local `spec-guard`, `docs:check`, and `docs:freshness` passes plus the run manifest `.runs/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/cli/2026-03-14T08-08-30-226Z-8a2ddcba/manifest.json`.
