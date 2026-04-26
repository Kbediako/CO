---
id: 20260426-linear-f838cbde-8bb6-46de-bde2-b749f2e64422
title: "CO: retire stale 0.124 evidence-book residue after Codex 0.125 adoption"
relates_to: docs/PRD-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md
risk: medium
owners:
  - Codex
last_review: 2026-04-26
related_action_plan: docs/ACTION_PLAN-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md
task_checklists:
  - tasks/tasks-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md
---

# TECH_SPEC Mirror - CO-379 retire stale 0.124 evidence-book residue

This mirror keeps docs freshness and reviewer navigation aligned with the canonical spec at `tasks/specs/linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`.

## Summary
- Objective: preserve CO-341/CO-345 `0.124.0` evidence while removing the stale active-book filename/path from current-facing posture surfaces.
- Scope: historical evidence page path, book/index links, posture matrix, docs catalog, focused docs-hygiene coverage, and validation evidence.
- Constraints: no model/runtime/workflow/package target changes and no deletion-only cleanup.

## Required Current Truth
- Current CO-local ChatGPT-auth/appserver posture: Codex CLI `0.125.0` plus `gpt-5.5` / `xhigh` when live access smoke passes.
- Portable fallback posture: `gpt-5.4` / `xhigh` only where access, cloud/API portability, or downstream/no-network assumptions require it.
- Cloud-only candidate split: Codex CLI `0.124.0` remains a cloud-canary candidate where explicitly documented, not current local posture.
- Historical evidence: CO-341/CO-345 `0.124.0` evidence remains available under historical/archive status.

## Implementation Contract
- Move or rename the former docs/book/codex-cli-0124-adoption.md page to a clearly historical/archive path.
- Update current-facing navigation and matrix/catalog metadata to point at that historical/archive path.
- Preserve the page's evidence boundary and current-posture disclaimer.
- Update focused docs-hygiene tests or fixtures that encode the historical evidence link target.
- Run the requested docs checks and focused coverage before handoff.

## Not Done If
- A current-facing book/docs path still presents `0.124.0` as current CO-local posture.
- CO-341/CO-345 evidence is removed.
- The posture matrix or docs catalog still treats the old page as an active current surface.
- Validation is incomplete or unresolved.
