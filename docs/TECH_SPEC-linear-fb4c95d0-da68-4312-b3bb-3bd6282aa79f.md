---
id: 20260418-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f
title: Control host / CO STATUS: prevent top-level tracked.linear from leaking stale linear-advisory fallback truth
relates_to: docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- PRD: `docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- Task checklist: `tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`

## Traceability
- Linear issue: `CO-223` / `fb4c95d0-da68-4312-b3bb-3bd6282aa79f`
- Linear URL: https://linear.app/asabeko/issue/CO-223/control-host-co-status-prevent-top-level-trackedlinear-from-leaking
- Source anchor: `ctx:sha256:ff78d09226d759620c87d1f1ae2de5782e81e7eda07b01112ef35807344be9b1#chunk:c000001`
- Source object id: `sha256:ff78d09226d759620c87d1f1ae2de5782e81e7eda07b01112ef35807344be9b1`
- Expected source payload: `.runs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f-co223-docs-packet/cli/2026-04-17T18-00-08-729Z-4c76d75d/memory/source-0/source.txt`
- Docs packet child lane: `.runs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f-co223-docs-packet/cli/2026-04-17T18-00-08-729Z-4c76d75d/manifest.json`
- Source note: the expected shared source payload is absent in this child checkout, so the packet preserves the verbatim CO-223 issue prompt recovered via read-only Linear fetch plus direct repo inspection of `controlRuntime.ts`, `selectedRunProjection.ts`, and `observabilityReadModel.ts`.

## Summary
- Objective: stop top-level `tracked.linear` from leaking stale advisory fallback truth when live dispatch and provider-intake truth are already current elsewhere.
- Scope:
  - docs-first packet and registry/checklist mirrors for `CO-223`
  - parent-owned authority-precedence and fail-closed null behavior for top-level tracked truth
  - parent-owned alignment across `co-status`, `/api/v1/state`, and `/ui/data.json`
  - parent-owned focused regressions distinct from `CO-219`, `CO-220`, and `CO-222`
- Constraints:
  - child lane remains docs-only; parent owns implementation, tests, docs-review, validation, Linear/workpad state, PR, and merge
  - `docs/TASKS.md` is already at the `450`-line cap in this checkout, so this child lane leaves that file untouched and records the omission for parent-owned wider-scope handling
  - preserve the exact seams `tracked.linear`, `controlRuntime.ts`, `selectedRunProjection.ts`, `observabilityReadModel.ts`, `linear-advisory-state.json`, `co-status`, `/api/v1/state`, and `/ui/data.json`

## Issue-Shaping Contract
- User-request translation carried forward: when the selected projection has no authoritative tracked payload, top-level `tracked.linear` must prefer current dispatch/intake truth or remain empty. It must not leak stale `linear-advisory-state.json` fallback data as if it were current queue truth.
- Protected terms / exact artifact and surface names:
  - `tracked.linear`
  - `tracked.linear.identifier`
  - `tracked_issue.identifier`
  - `linear-advisory-state.json`
  - `controlRuntime.ts`
  - `selectedRunProjection.ts`
  - `observabilityReadModel.ts`
  - `co-status`
  - `/api/v1/state`
  - `/ui/data.json`
  - `CO-196`
  - `CO-1`
  - `CO-219`
  - `CO-220`
  - `CO-222`
- Nearby wrong interpretations to reject:
  - reopening `CO-219`, `CO-220`, or `CO-222`
  - fixing only one surface while others keep stale tracked fallback truth
  - hiding the bug by deleting useful current tracked data
  - broad generic dispatch-selection redesign without proving it is the minimal seam
- Explicit non-goals carried forward:
  - no dead-proof running/max-allowed overcount work from `CO-219`
  - no stale reset-to-Rework or stale attached PR work from `CO-220`
  - no resumed-run retry-failure truth work from `CO-222`
  - no implementation or test edits from this child lane

## Parity / Alignment Matrix
- Current truth:
  - `controlRuntime.ts` falls back from `selected?.tracked` to advisory-state `tracked_issue`
  - `selectedRunProjection.ts` can seed tracked issue context from advisory-state snapshots
  - persisted `linear-advisory-state.json` can still carry historical tracked truth such as `CO-1`
  - `co-status`, `/api/v1/state`, and `/ui/data.json` can therefore expose stale top-level tracked truth
- Reference truth:
  - current dispatch and provider-intake truth should outrank stale advisory fallback truth
  - if no authoritative tracked truth exists, the surface should fail closed empty/null
- Target truth / intended delta:
  - top-level `tracked.linear` prefers current dispatch/intake truth when available
  - stale advisory fallback truth no longer leaks as pseudo-current truth
  - all three surfaces stay aligned for the tracked contract
- Explicitly out-of-scope differences:
  - `CO-219` running/max-allowed overcount
  - `CO-220` stale reset-to-Rework or stale attached PR truth
  - `CO-222` resumed-run retry-failure truth

## Readiness Gate
- Not done if:
  - top-level `tracked.linear` can still show stale `CO-1` while current dispatch/intake truth already points at `CO-196`
  - only one of `co-status`, `/api/v1/state`, or `/ui/data.json` is fixed
  - the fix hides the problem by dropping useful current tracked data instead of preferring truthful current state
- Pre-implementation issue-quality review evidence:
  - 2026-04-18: child-lane review confirms the issue is narrower than a generic dispatch redesign. The explicit seam is the advisory fallback precedence from `controlRuntime.ts` through `selectedRunProjection.ts` and persisted `linear-advisory-state.json` into top-level `tracked.linear`. The micro-task path is ineligible because correctness depends on exact protected names, exact cross-surface alignment, and exact separation from `CO-219`, `CO-220`, and `CO-222`.
- Safeguard ownership split:
  - child lane owns only the packet files plus `tasks/index.json` and `docs/docs-freshness-registry.json`
  - parent lane owns implementation, focused tests, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and any `docs/TASKS.md` archive-supported update

## Technical Requirements
- Functional requirements:
  1. Create the docs-first packet and registry/checklist mirrors for `CO-223`.
  2. Reproduce the shape where current dispatch/intake truth is current but advisory fallback still points at an older tracked issue.
  3. Ensure top-level `tracked.linear` no longer projects stale advisory fallback truth when current dispatch/intake truth is available.
  4. Ensure top-level `tracked.linear` fails closed to a truthful empty/null shape when no authoritative tracked truth is available.
  5. Keep `co-status`, `/api/v1/state`, and `/ui/data.json` aligned for this surface.
  6. Keep regression coverage explicitly distinct from `CO-219`, `CO-220`, and `CO-222`.
- Non-functional requirements:
  - preserve useful current tracked truth
  - avoid broad generic dispatch redesign unless proven necessary
  - preserve machine-checkable explanation of why the advisory fallback is stale or unused
- Interfaces / contracts:
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - top-level tracked payload used by `co-status`, `/api/v1/state`, and `/ui/data.json`

## Architecture & Data
- Architecture / design adjustments:
  - keep persisted `linear-advisory-state.json` as bounded fallback only
  - enforce authoritative tracked-state precedence before top-level `tracked.linear` is shaped
  - use one shared tracked-truth contract across CLI/API/UI surfaces so the stale fallback cannot leak through one path only
- Data model changes / migrations:
  - no packet-side data migration
  - parent implementation may add helper logic or precedence checks but should not require widening the issue into generic dispatch redesign without evidence
- External dependencies / integrations:
  - parent-owned focused regressions in `ControlRuntime` and `SelectedRunProjection`
  - any parent-selected API/UI alignment test coverage needed for `/api/v1/state` and `/ui/data.json`

## Validation Plan
- Child-lane checks:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `git diff --check -- docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md docs/TECH_SPEC-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md .agent/task/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md tasks/index.json docs/docs-freshness-registry.json`
  - protected-term grep across the touched packet files
- Parent-lane checks:
  - focused `orchestrator/tests/ControlRuntime.test.ts`
  - focused `orchestrator/tests/SelectedRunProjection.test.ts`
  - parent-selected API/UI alignment coverage for `co-status`, `/api/v1/state`, and `/ui/data.json`
  - parent-owned docs-review and post-patch `node scripts/spec-guard.mjs --dry-run`
- Rollout verification:
  - parent records the reproduced stale `CO-1` vs current `CO-196` split
  - parent records the aligned empty/null or current-truth top-level tracked behavior after the fix

## Open Questions
- Should the fail-closed empty/null contract be enforced before `buildTrackedLinearPayload(...)`, inside it, or through a shared tracked-authority helper?
- When both dispatch and provider-intake surfaces are present but differ, what is the smallest truthful precedence rule that keeps all three surfaces aligned?
- Does parent validation need one explicit `/api/v1/state` or `/ui/data.json` regression beyond `ControlRuntime` and `SelectedRunProjection` to keep the surface contract honest?

## Approvals
- Reviewer: pending parent docs-review / implementation.
- Date: 2026-04-18.
