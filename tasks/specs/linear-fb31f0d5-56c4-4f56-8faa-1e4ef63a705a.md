---
id: 20260426-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a
title: "CO-394 expire provider workflow fallback mappings"
relates_to: docs/PRD-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md
risk: high
owners:
  - Codex
last_review: 2026-05-19
related_action_plan: docs/ACTION_PLAN-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md
task_checklists:
  - tasks/tasks-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md
---

## Canonical Reference
- PRD: `docs/PRD-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- Task checklist: `tasks/tasks-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- Source policy: `docs/guides/fallback-expiry-and-refactor-policy.md`
- Large-refactor owner: `CO-400`

## Summary
- Objective: expire provider workflow fallback mappings by recording CO-382 metadata and validation against the provider-id mapping and retained-claim/autopilot paths.
- Scope: `providerIssueHandoff.ts`, focused provider workflow tests, docs packet, registry mirrors, and workpad evidence.
- Constraints: no broad provider workflow redesign, no admission-safety weakening, no unrelated fallback surfaces.

## Issue-Shaping Contract
- User-request translation carried forward: decide whether provider workflow fallback paths should be removed, time-boxed, or consolidated through a larger refactor.
- Protected terms: `provider workflow`, `fallback expiry`, `large refactor`, `minor seam`, `remove fallback`, `expire fallback`, `justify retaining fallback`.
- Nearby wrong interpretations to reject: generic cleanup, weaker CO-125 admission constraints, extra provider fallback without metadata, review/merge/runtime fallback changes.
- Explicit non-goals: redesign all provider issue handoff behavior, weaken transition guards, or remove fallback behavior without focused validation.

## Parity / Alignment Matrix
- Current truth: provider-id task mapping and retained-claim current-state arbitration still carry fallback naming and cached/synthetic paths.
- Reference truth: CO-382 requires owner, trigger, introduced date, review date, maximum lifetime, removal condition, and validation for retained fallbacks.
- Target truth: CO-394 records expiry metadata and validates current behavior; `CO-400` owns the larger current-state authority consolidation.
- Explicitly out-of-scope differences: review wrapper, runtime routing, docs freshness ownership, and control-host status fallback policy.

## Readiness Gate
- Not done if:
  - provider workflow fallback paths lack owner/removal metadata
  - the issue only documents fallbacks without deciding
  - a new provider workflow seam is added
  - validation misses activation/non-activation paths
- Pre-implementation issue-quality review: approved to proceed as a high-churn fallback-expiry lane; micro-task path is unavailable.
- Safeguard ownership split: parent owns Linear state, workpad, implementation, validation, PR, and review lifecycle.

## Technical Requirements
- Functional requirements:
  1. Inventory provider-id mapping fallback and retained-claim/autopilot fallback paths.
  2. Record `expire fallback` metadata for each retained provider workflow fallback path.
  3. Preserve current provider workflow behavior in CO-394.
  4. Link the large current-state authority refactor to `CO-400`.
  5. Add a focused provider workflow metadata regression and rerun existing behavior coverage.
- Non-functional requirements:
  - metadata must be reviewable and machine-checkable enough for tests
  - no behavior weakening in admission, duplicate-worker, or expected-state guards
- Interfaces / contracts:
  - exported provider workflow fallback expiry registry in `providerIssueHandoff.ts`
  - docs packet and task mirrors reference the same fallback decisions

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `provider workflow` | provider-id mapping fallback | `expire fallback` | `CO-400` | Provider issue handoff derives task identity with buildProviderFallbackTaskId and persists mapping_source=provider_id_fallback when no canonical provider task mapping exists. | 2026-03-19 | 2026-05-10 | 2026-05-26 | Remove after provider issue current-state authority owns canonical task identity for fresh starts, retries, and rehydrated claims without relying on provider-id fallback mapping. | metadata regression plus existing provider start activation tests |
| `provider workflow` | retained-claim/autopilot fallback | `expire fallback` | `CO-400` | Active claim refresh, retained released claims, and autopilot recovery fall back to cached claim issue state or retained run proof when fresh Linear state is unavailable or inconclusive. | 2026-03-20 | 2026-05-10 | 2026-05-26 | Remove after provider issue current-state authority resolves retained claim, autopilot, fresh Linear, and run-manifest state through one authoritative decision path. | metadata regression plus existing retained-claim activation and non-activation tests |

Large-refactor check: `CO-400` is required because the retained-claim/autopilot path splits authority across live issue state, provider-intake cache, retained run proof, and autopilot snapshots.

## Architecture & Data
- Architecture adjustments: add metadata only; no runtime behavior change in CO-394.
- Data changes: none.
- External dependencies: Linear follow-up `CO-400`.

## Validation Plan
- Tests / checks:
  - JSON parse checks for registry mirrors
  - focused provider workflow metadata regression plus existing behavior tests
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Rollout verification: standalone review, elegance pass, PR checks, ready-review drain.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-26
