---
id: 20260423-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c
title: "CO-330 stale control-host owner reclaim and provider refresh retry recovery"
relates_to: docs/PRD-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md
risk: high
owners:
  - Codex
last_review: 2026-04-23
---

# TECH_SPEC - CO-330 stale control-host owner reclaim and provider refresh retry recovery

This mirror points to the canonical task spec at `tasks/specs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`.

## Implementation Summary
- Preserve CO-330 as the stale control-host owner recovery lane for provider refresh failures that surface as `provider-linear-worker could not request control-host refresh`, `refresh request timeout`, or `fetch failed`.
- Keep this child-lane output bounded to docs-first packet creation and task registration.
- Parent implementation owns source/test changes for `stale_control_host_owner`, `control-host-stale-owner.json`, `provider-control-host-refresh-failure.json`, safe owner reclaim, provider refresh retry/resume semantics, and focused validation.
- CO-152 stale-owner ownership and CO-119 refresh-timeout recovery are prior related context only; they do not make CO-330 complete.

## Issue-Shaping Contract
- Protected terms / exact artifact and surface names: `stale_control_host_owner`, `control-host`, `provider-linear-worker could not request control-host refresh`, `refresh request timeout`, `fetch failed`, `control-host-stale-owner.json`, `provider-control-host-refresh-failure.json`, `owner reclaim`, `provider refresh`, `retry/resumable queue behavior`.
- Nearby wrong interpretations to reject: already owned by `CO-41`, only `CO-317` admission/backfill, generic host restart workaround, stdin bootstrap regression.
- Explicit non-goals: source/test edits in this lane, Linear mutations, broad control-host restart redesign, provider queue deletion during reclaim.

## Validation Contract
- Child lane:
  - bounded docs packet and `tasks/index.json` registration only
  - JSON parse check for `tasks/index.json`
  - scoped diff/status check showing only declared files changed
  - no full repo validation suites
- Parent lane:
  - docs-review before implementation
  - focused tests for stale-owner artifact, active-owner fail-closed behavior, stale owner reclaim, and provider refresh queue retry/resume
  - normal parent-owned validation and PR lifecycle
