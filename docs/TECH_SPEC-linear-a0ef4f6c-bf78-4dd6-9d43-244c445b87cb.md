---
id: 20260418-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb
title: CO STATUS observability restore compatibility row fields after post-recovery rehydrate
relates_to: docs/PRD-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- PRD: `docs/PRD-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- Task checklist: `tasks/tasks-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`

## Traceability
- Linear issue: `CO-227` / `a0ef4f6c-bf78-4dd6-9d43-244c445b87cb`
- Source anchor: `ctx:sha256:94042dd2db264d8821d3e322490b751dc925f36b8ea0692cb03302b6418ec7b0#chunk:c000001`
- Docs packet child lane manifest: `.runs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb-docs-packet/cli/2026-04-17T22-12-16-013Z-ad2f7b8b/manifest.json`
- Shared source note: expected shared source text is absent in this child checkout, so the packet is anchored on the live read-only CO-227 issue body plus current repo seam names.

## Summary
- Objective: restore post-recovery compatibility hydration so authenticated `/api/v1/state` exposes populated `running_ids` and `retrying_ids`, and `co-status --format json` exposes populated compatibility row fields `id`, `bucket`, `state`, `reason`, and `aliases` after rehydrate.
- Scope:
  - docs-first packet and registry/checklist mirrors for `CO-227`
  - parent-owned source and presenter/read-model implementation
  - parent-owned focused validation only
- Constraints:
  - preserve recovered canonical active-issue mapping
  - preserve meaningful event rendering
  - keep this defect distinct from `CO-223`, `CO-211`, `CO-146`, and `CO-189`

## Issue-Shaping Contract
- User-request translation carried forward: this lane is about post-recovery compatibility-field hydration after canonical active issue identity already recovered, not about restart churn, top-level tracked truth, synthetic fallback rows, or live-worker rehydrate/count restoration.
- Protected terms / exact artifact and surface names:
  - authenticated `/api/v1/state`
  - `running_ids`
  - `retrying_ids`
  - `co-status --format json`
  - compatibility fields `id`, `bucket`, `state`, `reason`, and `aliases`
  - `selectedRunProjection.ts`
  - `compatibilityIssuePresenter.ts`
  - `observabilityReadModel.ts`
  - `controlRuntime.ts`
  - `observabilitySurface.ts`
  - `operatorDashboardPresenter.ts`
- Nearby wrong interpretations to reject:
  - `CO-211` restart / refresh-stuck churn
  - `CO-223` stale top-level tracked Linear fallback truth
  - `CO-146` synthetic `linear-*` fallback row rendering
  - `CO-189` live-worker rehydrate recovery itself
  - accepting null compatibility ids and row fields as harmless because top-level counts are already correct
- Explicit non-goals carried forward:
  - no restart-churn repair
  - no top-level tracked-linear truth repair
  - no synthetic fallback-row rendering repair
  - no rehydrate/count restoration repair
  - no code or test edits in this child lane

## Parity / Alignment Matrix
- Current truth:
  - authenticated `/api/v1/state` exposes correct aggregate counts after rehydrate but keeps `running_ids` and `retrying_ids` null
  - `co-status --format json` exposes the live canonical set (`CO-196`, `CO-218`, `CO-210`) but keeps compatibility row fields `id`, `bucket`, `state`, `reason`, and `aliases` null
  - stale top-level `tracked.linear = CO-1` leakage can still exist separately and is already owned by `CO-223`
- Reference truth:
  - once canonical active rows recover, compatibility-facing ids and row metadata should recover from the same canonical mapping
  - `/api/v1/state` and `co-status --format json` should agree on the recovered canonical issue set and row identity metadata
  - meaningful event rendering should remain intact
- Target truth / intended delta:
  - `/api/v1/state` exposes populated `running_ids` and `retrying_ids`
  - `co-status --format json` rows expose populated compatibility `id`, `bucket`, `state`, `reason`, and `aliases`
  - the compatibility hydration fix remains distinct from top-level tracked-truth repair
- Explicitly out-of-scope differences:
  - restart-required / refresh-stuck churn
  - stale top-level tracked-linear fallback truth
  - synthetic `linear-*` fallback row rendering
  - original live-worker rehydrate/count restoration

## Readiness Gate
- Not done if:
  - authenticated `/api/v1/state` still leaves `running_ids` or `retrying_ids` null after rehydrate
  - `co-status --format json` still leaves compatibility row fields `id`, `bucket`, `state`, `reason`, or `aliases` null
  - the fix regresses recovered canonical issue mapping for active rows
  - the fix regresses meaningful event rendering
  - the implementation broadens into `CO-211`, `CO-223`, `CO-146`, or `CO-189` rather than preserving the distinct post-recovery compatibility-hydration seam
- Pre-implementation issue-quality review evidence:
  - 2026-04-18: the live issue body makes `CO-227` explicitly narrower than generic observability work and explicitly distinct from `CO-223`, `CO-211`, `CO-146`, and `CO-189`. The packet therefore treats this as a compatibility read-model/presenter hydration lane that starts only after canonical active identity already recovered.
  - 2026-04-18: the micro-task path is ineligible because correctness depends on exact protected wording, explicit non-goals, explicit not-done-if conditions, and the parity contract that separates this lane from nearby issues.
- Safeguard ownership split:
  - child lane owns only the declared docs/checklist/registry files
  - parent lane owns source/test inspection, implementation, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  1. Create the docs-first packet and registry/checklist mirrors for `CO-227`.
  2. After a control-host restart / rehydrate, authenticated `/api/v1/state` must expose populated `running_ids` and `retrying_ids` that match the live canonical issue set.
  3. After the same recovery path, `co-status --format json` must expose populated compatibility fields `id`, `bucket`, `state`, `reason`, and `aliases` for live or retrying rows.
  4. Preserve the recovered canonical mapping for active issues rather than introducing a second truth source.
  5. Preserve meaningful event rendering while hydrating compatibility fields.
  6. Keep the fix distinct from top-level stale tracked truth so `CO-223` stays a separate lane.
- Non-functional requirements:
  - deterministic post-recovery compatibility hydration
  - same recovered canonical issue set across `/api/v1/state` and `co-status --format json`
  - minimal bounded change inside existing projection/runtime/presenter seams
- Interfaces / contracts:
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`

## Architecture & Data
- Architecture / design adjustments:
  - reuse the existing post-rehydrate canonical mapping from the selected/compatibility runtime path instead of adding a second identity source
  - define one compatibility payload contract that owns `running_ids` and `retrying_ids` for `/api/v1/state`
  - feed `co-status --format json` row fields `id`, `bucket`, `state`, `reason`, and `aliases` from that same compatibility contract
- Required artifact/content expectations:
  - `ControlCompatibilityProjectionSnapshot` or an adjacent state-surface wrapper carries populated ids after rehydrate
  - compatibility row hydration carries `aliases` and stable row identity metadata forward after rehydrate
  - the row contract remains compatible with the newer event/message rendering path already present in `compatibilityIssuePresenter.ts`
- Data model changes / migrations:
  - additive compatibility payload fields or hydration is acceptable
  - no destructive migration or stale-history deletion is required
- External dependencies / integrations:
  - no Linear mutation from this child lane
  - parent lane may reuse the existing compatibility snapshot builder, state surface, and presenter plumbing instead of creating a new compatibility pipeline if one bounded hydration seam is sufficient

## Current Truth
- `controlRuntime.ts` already builds a `ControlCompatibilityRuntimeSnapshot` and then a `ControlCompatibilityProjectionSnapshot` through `buildCompatibilityProjectionSnapshot(...)`.
- `buildCompatibilityIssueIndex(...)` in `compatibilityIssuePresenter.ts` retains `runningOrder`, `retryOrder`, and per-issue `aliases`, but the externally exposed `ControlCompatibilityProjectionSnapshot` currently emits `running`, `retrying`, `issues`, and `selected`.
- `observabilityReadModel.ts` defines the compatibility-facing payloads: `ControlCompatibilityProjectionSnapshot`, `CompatibilityProjectionIssueRecord`, and `ControlIssuePayload`.
- The live issue evidence shows the canonical live rows are already back after rehydrate, but compatibility-facing ids and row fields remain partially null, which makes this a post-recovery hydration defect rather than a recovery or identity-selection defect.

## Proposed Design
- Add or restore one bounded compatibility hydration seam that:
  - surfaces populated `running_ids` and `retrying_ids` from the recovered canonical compatibility set
  - carries populated row metadata `id`, `bucket`, `state`, `reason`, and `aliases` into `co-status --format json`
  - preserves the already-correct recovered canonical issue mapping and event rendering
- Keep `CO-223` separate by treating top-level stale tracked truth as an adjacent but out-of-scope upstream leak rather than part of this row-hydration repair.

## Protected Expectations
- Preserve exact issue wording around post-recovery compatibility-field hydration for `/api/v1/state`, `running_ids`, `retrying_ids`, and `co-status --format json` row fields `id`, `bucket`, `state`, `reason`, and `aliases`.
- Preserve the recovered canonical active issue mapping.
- Preserve the newer meaningful event rendering.
- Keep this defect explicitly distinct from `CO-223`, `CO-211`, `CO-146`, and `CO-189`.

## Reject These Wrong Interpretations
- `This is just another tracked.linear top-level truth bug.`
- `This is the same as restart churn or worker rehydrate recovery.`
- `Top-level running counts are enough; row metadata can stay null.`
- `Fix the ids by reintroducing older synthetic fallback rows.`
- `Hydrate the compatibility fields even if it regresses the improved event rendering.`

## Validation Plan
- Child-lane checks:
  - JSON parse of `tasks/index.json`
  - protected-term grep across the touched packet files
  - `git diff --check` over the declared docs scope
- Parent-lane checks:
  - focused `SelectedRunProjection.test.ts`, `CompatibilityIssuePresenter.test.ts`, and `ControlRuntime.test.ts` coverage for post-rehydrate compatibility ids and row-field hydration
  - focused state-surface or presenter serialization coverage proving authenticated `/api/v1/state` and `co-status --format json` hydrate the same recovered issue set
  - parent docs-review before implementation
  - parent-selected scoped validation after source edits

## Approvals
- Reviewer: pending parent docs-review / implementation
- Date: 2026-04-18
