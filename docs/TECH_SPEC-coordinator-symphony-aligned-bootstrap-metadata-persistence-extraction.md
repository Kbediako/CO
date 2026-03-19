---
id: 20260309-1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction
title: Coordinator Symphony-Aligned Bootstrap Metadata Persistence Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md
related_tasks:
  - tasks/tasks-1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Bootstrap Metadata Persistence Extraction

## Summary

Extract the bootstrap metadata persistence block out of `controlServerBootstrapLifecycle.ts` into one control-local helper. The extracted seam should own the `control-auth.json` and `control-endpoint.json` writes, permission tightening, and initial control snapshot flush while the lifecycle keeps ordered startup ownership.

## Scope

- Add one new control-local helper/module under `orchestrator/src/cli/control/`, or another equally narrow extraction surface.
- Move the current bootstrap metadata persistence block out of `controlServerBootstrapLifecycle.ts`.
- Add focused regressions proving no change to persisted payloads, chmod behavior, or `persist -> expiry -> bridge` startup ordering.

## Out of Scope

- Telegram bridge runtime, polling, or teardown logic.
- Bridge subscription attachment semantics.
- Expiry lifecycle ownership changes.
- `controlServer.ts` bind/listen/start ownership changes unless a tiny import-site touch is required.
- Broader bootstrap lifecycle refactors beyond the persistence seam.

## Proposed Design

### 1. Bootstrap metadata persistence helper

Introduce a helper that owns:
- writing `control-auth.json`,
- chmod hardening of `control-auth.json`,
- writing `control-endpoint.json`,
- chmod hardening of `control-endpoint.json`,
- invoking the initial control snapshot persistence callback.

### 2. Thinner bootstrap lifecycle coordinator

`controlServerBootstrapLifecycle.ts` should keep:
- ordered startup sequencing,
- expiry lifecycle startup,
- Telegram bridge startup and subscription attachment,
- close/teardown behavior.

The lifecycle should delegate only the metadata persistence phase to the new helper.

## Files / Modules

- `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts`
- one new helper under `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServerBootstrapLifecycle.test.ts`

## Risks

- Accidentally changing persisted bootstrap payloads or chmod hardening.
- Reordering the existing `persist -> expiry -> bridge` startup sequence.
- Widening into Telegram bridge attach/teardown behavior for little payoff.

## Validation Plan

- Focused regressions for unchanged payload persistence and ordering.
- Standard docs-first guard bundle before implementation.
