---
id: 20260312-1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction
title: Coordinator Symphony-Aligned Control Server Shutdown Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md
related_tasks:
  - tasks/tasks-1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Server Shutdown Shell Extraction

## Summary

Extract the inline shutdown shell from `ControlServer.close()` so the class keeps only the public close contract plus top-level lifecycle ownership.

## Current State

After `1122`, `controlServer.ts` still owns one mixed shutdown shell:

1. close and null the expiry lifecycle,
2. await close and null the bootstrap lifecycle,
3. end open connected clients,
4. wrap `server.close()` in a promise.

That is now the next truthful boundary. It is smaller than the completed startup seams and should be extracted without reopening startup helpers or request routing.

## Symphony Alignment Note

Real Symphony keeps supervision start and stop shells explicit around the long-lived runtime they govern. CO should keep its own TypeScript-native authority model, but the same principle applies here: the shutdown shell should be isolated from the class body without broadening the control surface.

## Proposed Design

### 1. One bounded shutdown helper

Introduce one bounded helper that:
- owns expiry lifecycle teardown and reset,
- owns bootstrap lifecycle teardown and reset,
- ends open clients,
- awaits the final `server.close()` promise.

### 2. `ControlServer.close()` stays thin

`ControlServer.close()` should keep:
- delegating into the extracted shutdown helper,
- preserving the current public `Promise<void>` contract.

### 3. Explicit exclusions

This slice must not:
- change startup helpers,
- change request routing,
- change event transport,
- change the broader lifecycle policy beyond the extracted shutdown shell,
- broaden into review-wrapper work.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- optionally one tiny control-local helper module if same-file/private extraction is not the clearest shape
- focused coverage under `orchestrator/tests/`

## Risks

- Accidentally changing teardown ordering while extracting the shutdown shell.
- Breaking idempotent post-close field reset behavior.
- Reaching into startup or request-handling surfaces that are already bounded by earlier slices.

## Validation Plan

- Add focused regression coverage for the shutdown seam.
- Preserve existing `ControlServer` teardown behavior coverage.
- Run the standard docs-first guard bundle before implementation.
