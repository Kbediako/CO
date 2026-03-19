---
id: 20260303-0993-coordinator-control-bridge-slice-1
title: Coordinator Control Bridge Slice 1
relates_to: docs/PRD-coordinator-control-bridge-slice-1.md
risk: high
owners:
  - Codex
last_review: 2026-03-03
---

## Summary
- Objective: define implementation-ready contracts for a Coordinator-only control bridge that forwards `pause`, `resume`, `cancel`, and `status` to CO while preserving CO as execution authority.
- Scope: docs-first artifacts and task registration only; no `orchestrator/src` code edits in this stream.
- Constraints: no scheduler ownership transfer, no language rewrite, no unrelated refactors.

## Pre-Implementation Review Note
- Decision: proceed with docs-only slice to lock contracts before coding.
- Reasoning: control/auth/idempotency/traceability boundaries are high-risk and must be explicit before implementation.

## Technical Requirements
- Functional requirements:
  - Define Coordinator-to-CO control interface for `pause`, `resume`, `cancel`, `status`.
  - Define strict auth/token boundary for control actions with CO as the enforcement owner.
  - Define idempotency semantics for duplicate control intents and duplicate transport requests.
  - Define canonical trace chain mapping: `intent_id -> task_id -> run_id -> manifest_path`.
  - Define auditable outputs required in manifests/events/status responses for every control action.
  - Define deterministic rejection semantics for invalid/unauthorized/misaligned control requests.
  - Capture docs-review manifest evidence before any implementation edits.
- Non-functional requirements:
  - Fail-closed behavior on missing/invalid auth context.
  - Idempotent duplicate handling with no duplicate side effects.
  - Clear run recovery path from `manifest_path` as canonical locator.
  - No behavioral changes to scheduler authority (remains in CO).
- Interfaces / contracts:
  - Coordinator sends control-intent envelopes with actor, reason, intent ID, and target run handle.
  - CO validates auth/policy, applies control transition (or returns no-op/duplicate response), and records audit fields in run artifacts.
  - Status reads must support lookup by `run_id` or `manifest_path` and always return trace linkage fields.

## Required Realignment (Planning Inputs -> Current CO)
### 1) What still applies from `/Users/kbediako/Documents/Plans/CO/coordinator/*.md`
- Coordinator remains an intake/routing/control bridge; CO remains execution truth and scheduler authority.
- Bridge v0 action surface (`pause`, `resume`, `cancel`, `status`) remains the first control slice.
- Intent-schema requirements remain valid: mandatory `intent_id`, dedupe safety, immutable intent records, auditable transitions.
- Lightweight charter guardrails remain valid: thin core loop, no duplicated execution truth, no duplicate auth model.
- Sidecar-first incremental rollout remains valid.

### 2) What changed in CO since those docs (runtime defaults/policies)
- Runtime default changed after the planning docs: local default is `runtimeMode=appserver`; `runtimeMode=cli` is break-glass.
- Execution/runtime semantics are explicitly orthogonal policy (`executionMode` vs `runtimeMode`), with fail-fast for unsupported cloud+appserver combination.
- `js_repl` moved to default-enabled policy globally; cloud lanes now rely on explicit per-task feature lane pinning.
- Delegation and manifest evidence expectations tightened for top-level task streams (with explicit override reason if delegation is impossible).

### 3) What must be updated before coding
- Update control bridge contract wording to reflect current runtime policy and terminology without expanding scope.
- Freeze control auth token contract fields (issuer, audience, scope/action, TTL, replay protection, and redaction rules in logs/manifests).
- Freeze idempotency contract for each action:
  - dedupe key composition,
  - dedupe window,
  - duplicate response codes/body,
  - no-op semantics for already-paused/already-resumed/already-cancelled states.
- Freeze audit contract fields in manifest/events/status outputs:
  - `intent_id`, `task_id`, `run_id`, `manifest_path`,
  - `control_action`, `actor`, `reason`, `received_at`, `applied_at`, `result`.
- Define explicit invariants and reject conditions:
  - no scheduler mutation requests accepted from Coordinator,
  - no control bypass without valid token,
  - no silent drops for duplicate/invalid requests.

## Architecture & Data
- Architecture / design adjustments:
  - Coordinator is a bridge client over CO control surfaces.
  - CO remains single execution/control/scheduler authority.
  - Slice 1 is control forwarding plus audit/trace contracts only.
- Data model changes / migrations (planned):
  - Add documented control-intent envelope fields and idempotency key semantics.
  - Add documented manifest/event/status audit fields for control actions.
  - No storage migration in this docs stream.
- External dependencies / integrations:
  - Existing CO run manifests/events/status surfaces.
  - Existing CO policy/auth control plane.

## Validation Plan
- Ordered quality gates (1-10):
  - `node scripts/delegation-guard.mjs --task 0993-coordinator-control-bridge-slice-1`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Additional contract checks (implementation phase):
  - duplicate control intent replay tests per action.
  - auth failure and token-expiry failure-path tests.
  - trace-chain reconstruction test from status payload to manifest/event records.

## Open Questions
- Which token issuer and audience contract should be canonical for Coordinator control calls in CO environments with mixed local/cloud lanes?
- Should dedupe windows differ by control action (`status` vs mutating controls), or stay uniform for operator simplicity?

## Approvals
- Reviewer: Codex.
- Date: 2026-03-03.
