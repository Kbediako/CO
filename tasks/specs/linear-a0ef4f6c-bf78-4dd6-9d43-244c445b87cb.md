---
id: 20260418-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb
title: CO STATUS observability restore compatibility row fields after post-recovery rehydrate
status: done
relates_to: docs/PRD-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (24 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- PRD: `docs/PRD-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- Task checklist: `tasks/tasks-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`

## Traceability
- Linear issue: `CO-227` / `a0ef4f6c-bf78-4dd6-9d43-244c445b87cb`
- Linear URL: https://linear.app/asabeko/issue/CO-227/co-status-observability-restore-compatibility-row-fields-after-post
- Source anchor: `ctx:sha256:94042dd2db264d8821d3e322490b751dc925f36b8ea0692cb03302b6418ec7b0#chunk:c000001`
- Docs packet child lane: `.runs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb-docs-packet/cli/2026-04-17T22-12-16-013Z-ad2f7b8b/manifest.json`
- Shared source note: expected shared source text is absent in this child checkout, so the packet preserves the live read-only CO-227 issue wording plus current repo seam names.

## Summary
- Objective: restore populated post-recovery compatibility ids and row fields after rehydrate so `/api/v1/state` exposes `running_ids` and `retrying_ids`, and `co-status --format json` exposes populated compatibility row fields `id`, `bucket`, `state`, `reason`, and `aliases`.
- Scope:
  - docs-first packet and registry/checklist mirrors for `CO-227`
  - parent-owned compatibility projection/state/presenter implementation
  - parent-owned focused validation only
- Constraints:
  - preserve recovered canonical active mapping
  - preserve newer meaningful event rendering
  - preserve explicit separation from `CO-223`, `CO-211`, `CO-146`, and `CO-189`

## Issue-Shaping Contract
- User-request translation carried forward: this lane is about post-recovery compatibility-field hydration after the canonical active issue set already recovered, not about top-level tracked truth, restart churn, synthetic fallback row rendering, or original live-worker rehydrate recovery.
- Protected terms / exact artifact and surface names:
  - authenticated `/api/v1/state`
  - `running_ids`
  - `retrying_ids`
  - `co-status --format json`
  - row fields `id`, `bucket`, `state`, `reason`, and `aliases`
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
  - `CO-189` rehydrate-live-worker recovery itself
  - aggregate counts alone are sufficient, so null compatibility ids and row fields are acceptable
- Explicit non-goals carried forward:
  - no restart-churn repair
  - no top-level tracked-linear truth repair
  - no synthetic fallback-row rendering repair
  - no original live-worker rehydrate/count restoration repair
  - no code or test edits in this child lane

## Parity / Alignment Matrix
- Current truth:
  - authenticated `/api/v1/state` shows the recovered live counts (`running=3`, `retrying=0`) but keeps `running_ids` and `retrying_ids` null
  - `co-status --format json` shows the recovered live set (`CO-196`, `CO-218`, `CO-210`) but keeps compatibility row fields `id`, `bucket`, `state`, `reason`, and `aliases` null
  - stale top-level `tracked.linear = CO-1` leakage still exists separately and is already owned by `CO-223`
- Reference truth:
  - once canonical issue identity and live occupancy recover, compatibility-facing ids and row fields should recover from the same canonical mapping
  - `/api/v1/state` and `co-status --format json` should agree on the live canonical issue set
  - meaningful event rendering should remain intact
- Target truth / intended delta:
  - `running_ids` and `retrying_ids` are populated after rehydrate
  - live or retrying rows expose populated compatibility fields `id`, `bucket`, `state`, `reason`, and `aliases`
  - the fix stays explicitly distinct from top-level tracked-truth repair
- Explicitly out-of-scope differences:
  - restart-required / refresh-stuck churn
  - stale top-level tracked truth
  - synthetic fallback-row rendering
  - original live-worker rehydrate/count restoration

## Readiness Gate
- Not done if:
  - authenticated `/api/v1/state` still leaves `running_ids` or `retrying_ids` null after rehydrate
  - `co-status --format json` still leaves row fields `id`, `bucket`, `state`, `reason`, or `aliases` null after rehydrate
  - the fix regresses recovered canonical active mapping
  - the fix regresses meaningful event rendering
  - the implementation broadens into `CO-223`, `CO-211`, `CO-146`, or `CO-189`
- Pre-implementation issue-quality review evidence:
  - 2026-04-18: the live CO-227 issue body explicitly separates this defect from `CO-223`, `CO-211`, `CO-146`, and `CO-189`. The packet therefore treats the issue as a post-recovery compatibility snapshot/presenter hydration gap, not a broader recovery or identity-selection lane.
  - 2026-04-18: the micro-task path is ineligible because exact protected wording, the explicit issue-separation contract, and the parity matrix are all part of the requested deliverable.
- Safeguard ownership split:
  - child lane owns only the declared docs/checklist/registry files
  - parent lane owns source/test inspection, implementation, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  1. Preserve the exact CO-227 wording in the docs-first packet.
  2. Restore populated `running_ids` and `retrying_ids` after rehydrate for authenticated `/api/v1/state`.
  3. Restore populated compatibility row fields `id`, `bucket`, `state`, `reason`, and `aliases` after the same recovery path for live or retrying `co-status --format json` rows.
  4. Preserve the recovered canonical mapping for active issues.
  5. Preserve the newer meaningful event rendering.
  6. Keep the repair explicitly separate from top-level tracked-truth work in `CO-223`.
- Non-functional requirements:
  - deterministic post-recovery compatibility hydration
  - same recovered canonical issue set across API and CLI state surfaces
  - minimal bounded change within existing compatibility runtime/projection/presenter seams
- Interfaces / contracts:
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`

## Architecture & Data
- Architecture / design adjustments:
  - parent should reuse the same recovered canonical compatibility set already present after rehydrate
  - parent should choose one bounded contract for populating `running_ids` and `retrying_ids`
  - parent should ensure the same contract hydrates row fields `id`, `bucket`, `state`, `reason`, and `aliases`
- Required artifact/content expectations:
  - compatibility ids and row metadata are populated after rehydrate without reintroducing stale fallback truth
  - `aliases` continue to derive from the compatibility/source context rather than becoming a separate lookup path
  - meaningful event/message rendering continues to flow from the existing compatibility presenter path
- Data model changes / migrations:
  - additive compatibility snapshot or presenter fields are acceptable
  - no destructive migration is required
- External dependencies / integrations:
  - no Linear mutation from this child lane
  - parent lane may reuse existing runtime/projection helpers rather than creating new compatibility stages if one bounded hydration seam is sufficient

## Current Truth
- `selectedRunProjection.ts` already builds a `ControlCompatibilitySourceContext` and discovers compatibility collection contexts after rehydrate.
- `controlRuntime.ts` already assembles a `ControlCompatibilityRuntimeSnapshot` and then a `ControlCompatibilityProjectionSnapshot`.
- `compatibilityIssuePresenter.ts` already retains `runningOrder`, `retryOrder`, and per-issue `aliases` in the internal index while exposing `running`, `retrying`, `issues`, and `selected` externally.
- `observabilityReadModel.ts` already defines the compatibility-facing payload shapes consumed by `/api/v1/state` and adjacent presenter surfaces.
- The live CO-227 evidence shows canonical live rows are already back, so the missing ids and null row fields are a post-recovery compatibility hydration gap, not a canonical identity recovery failure.

## Proposed Design
- Add or restore one bounded compatibility hydration seam that:
  - surfaces populated `running_ids` and `retrying_ids` from the recovered canonical compatibility set
  - carries populated row fields `id`, `bucket`, `state`, `reason`, and `aliases` into `co-status --format json`
  - keeps the recovered canonical mapping and meaningful event rendering unchanged
- Keep `CO-223` separate by treating stale top-level tracked truth as an adjacent upstream defect rather than part of this row-hydration repair.

## Protected Expectations
- Preserve exact issue wording around post-recovery compatibility-field hydration for `/api/v1/state`, `running_ids`, `retrying_ids`, and `co-status --format json` row fields `id`, `bucket`, `state`, `reason`, and `aliases`.
- Preserve recovered canonical mapping for active issues.
- Preserve the newer meaningful event rendering.
- Preserve explicit issue separation from `CO-223`, `CO-211`, `CO-146`, and `CO-189`.

## Reject These Wrong Interpretations
- `This is just another top-level tracked.linear bug.`
- `This is only restart churn or worker rehydrate restoration under a new name.`
- `If the counts are right, compatibility row metadata can stay null.`
- `Bring back synthetic fallback rows to fill the null ids.`
- `Hydrate row metadata even if it regresses event rendering.`

## Validation Plan
- Child-lane checks:
  - JSON parse of `tasks/index.json`
  - protected-term grep across the touched packet files
  - `git diff --check` over the declared docs scope
- Parent-lane checks:
  - focused `SelectedRunProjection.test.ts`, `CompatibilityIssuePresenter.test.ts`, and `ControlRuntime.test.ts` coverage for post-rehydrate compatibility ids and row-field hydration
  - focused serialization coverage proving authenticated `/api/v1/state` and `co-status --format json` hydrate the same recovered issue set
  - focused regression ensuring meaningful event rendering does not regress
  - parent docs-review before implementation
  - parent-selected scoped validation after source edits

## Approvals
- Reviewer: pending parent docs-review / implementation
- Date: 2026-04-18
