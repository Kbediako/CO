---
id: 20260418-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f
title: Control host / CO STATUS: prevent top-level tracked.linear from leaking stale linear-advisory fallback truth
status: in_progress
owner: Codex
created: 2026-04-18
last_review: 2026-06-17
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md
related_action_plan: docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md
related_tasks:
  - tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-04-18: Opened from bounded same-issue docs child lane for `CO-223` with source anchor `ctx:sha256:ff78d09226d759620c87d1f1ae2de5782e81e7eda07b01112ef35807344be9b1#chunk:c000001` and origin manifest `.runs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f-co223-docs-packet/cli/2026-04-17T18-00-08-729Z-4c76d75d/manifest.json`.
  - 2026-04-18: The expected shared source payload path is absent in this child checkout, so the packet preserves the verbatim CO-223 issue prompt recovered via read-only Linear fetch plus direct repo inspection of `controlRuntime.ts`, `selectedRunProjection.ts`, and `observabilityReadModel.ts`.
  - 2026-04-18: The docs child lane left `docs/TASKS.md` untouched because that checkout reported a `450`-line cap constraint.
  - 2026-04-19: Parent lane added the CO-223 active-task snapshot row to `docs/TASKS.md` after current `origin/main` had line-count headroom, so no archive movement was required.
  - 2026-05-18: CO-522 active-spec audit found 3 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Context

`CO-223` is a narrow top-level tracked-truth issue, not a generic dispatch redesign. The verbatim issue prompt is explicit: live dispatch and provider-intake truth have already converged on current queue truth, but top-level `tracked.linear` can still leak historical advisory fallback truth from persisted `linear-advisory-state.json`.

The concrete reproduced split from the issue is:

- authenticated live control-host dispatch returned `tracked_issue.identifier = CO-196`
- provider intake rehydrated running claims for `CO-196`, `CO-210`, and `CO-215`
- top-level `tracked.linear.identifier` still exposed historical `CO-1`

Current repo truth already shows the narrow leak path:

- `controlRuntime.ts` reads `selected?.tracked ?? buildTrackedLinearPayload(context.linearAdvisoryState.tracked_issue)` in both selected-run and compatibility runtime snapshots
- `selectedRunProjection.ts` seeds `trackedIssue` from `context.linearAdvisoryState.tracked_issue` for the current run context and also reads persisted advisory snapshots when reconstructing selected or discovered run context
- persisted `linear-advisory-state.json` is therefore still available to shape top-level tracked truth even when newer current dispatch/intake truth exists elsewhere

This issue is about authority precedence and fail-closed null behavior for the top-level tracked surface. It is not permission to reopen `CO-219`, `CO-220`, or `CO-222`, and it is not permission to redesign generic dispatch selection unless the parent proves that is the smallest seam that can keep the tracked surface truthful.

## Requirements

1. Reproduce the shape where live dispatch and provider-intake truth are current but persisted advisory fallback still points at an older tracked issue.
2. Ensure top-level `tracked.linear` no longer projects stale advisory fallback truth when current dispatch/intake truth is available.
3. Ensure top-level `tracked.linear` fails closed to a truthful empty/null shape when no authoritative tracked truth is available.
4. Keep `co-status`, `/api/v1/state`, and `/ui/data.json` aligned for this top-level tracked contract.
5. Keep regression coverage explicitly distinct from:
   - `CO-219` dead-proof running/max-allowed overcount
   - `CO-220` stale reset-to-Rework or stale attached PR truth
   - `CO-222` resumed-run retry-failure truth
6. Preserve persisted advisory snapshots as bounded fallback only; do not turn them into stale pseudo-current truth.

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
- Exact seams to preserve:
  - `tracked.linear`
  - `controlRuntime.ts`
  - `selectedRunProjection.ts`
  - `observabilityReadModel.ts`
  - `linear-advisory-state.json`
  - `co-status`
  - `/api/v1/state`
  - `/ui/data.json`
- Nearby wrong interpretations to reject:
  - `CO-219` running/max-allowed overcount work
  - `CO-220` stale Rework or stale attached PR truth
  - `CO-222` resumed-run retry-failure truth
  - fixing only one surface while another still leaks stale tracked truth
  - deleting useful current tracked data instead of preferring truthful current state
  - widening into generic dispatch selection redesign without proving that narrower authority precedence cannot solve the bug
- Explicit non-goals carried forward:
  - no adjacent status-truth or retry-truth redesign outside this top-level tracked fallback leak
  - no implementation or test edits in this child lane
  - no parent-state, workpad, or PR lifecycle mutation in this child lane

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth |
| --- | --- | --- | --- |
| Top-level `tracked.linear` | Falls back to advisory-state `tracked_issue` when `selected?.tracked` is absent. | Current dispatch and provider-intake truth should outrank historical advisory fallback truth. | Prefer current dispatch/intake truth; otherwise fail closed empty/null. |
| Selected projection context | `selectedRunProjection.ts` seeds tracked issue context from advisory-state snapshots. | Advisory state is bounded fallback only. | Advisory state remains fallback only when no authoritative tracked truth exists. |
| Persisted advisory snapshot | Historical `CO-1` can still survive in `linear-advisory-state.json`. | Historical fallback must not masquerade as current queue truth. | Historical fallback is ignored when newer current tracked truth exists. |
| Surface alignment | `co-status`, `/api/v1/state`, and `/ui/data.json` can diverge on top-level tracked truth. | All three surfaces should tell the same tracked story. | All three surfaces share one current-truth-or-empty contract. |

## Readiness Gate

- Not done if:
  - top-level `tracked.linear` can still show stale `CO-1` while current dispatch/intake truth already points at `CO-196`
  - only one of `co-status`, `/api/v1/state`, or `/ui/data.json` is fixed while another still leaks stale tracked truth
  - the repair hides the bug by deleting useful current tracked data rather than preferring truthful current state
- Pre-implementation issue-quality review evidence:
  - 2026-04-18: child-lane review confirms the issue is not narrower than a single renderer string change and not broader than the named tracked-authority seams. The exact issue wording requires current dispatch/intake truth or a truthful empty/null shape, explicit separation from `CO-219`, `CO-220`, and `CO-222`, and cross-surface alignment across `co-status`, `/api/v1/state`, and `/ui/data.json`. The micro-task path is ineligible because correctness depends on exact protected seams, exact surface names, and explicit non-goals.
- Safeguard ownership split:
  - child lane owns only the packet files and listed registry/checklist mirrors
  - parent lane owns implementation, focused tests, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and `docs/TASKS.md` mirror maintenance

## Technical Requirements

- Functional requirements:
  1. Create the docs-first packet and registry/checklist mirrors for `CO-223`.
  2. Reproduce the stale `CO-1` vs current `CO-196` split from the issue.
  3. Prefer current dispatch/intake tracked truth over advisory fallback truth when authoritative current truth exists.
  4. Fail closed empty/null when no authoritative tracked truth exists.
  5. Keep `co-status`, `/api/v1/state`, and `/ui/data.json` aligned for this tracked contract.
  6. Distinguish this regression boundary from `CO-219`, `CO-220`, and `CO-222`.
- Non-functional requirements:
  - preserve useful current tracked data
  - preserve bounded advisory fallback behavior for genuinely no-authority cases
  - avoid broad generic dispatch redesign unless proven necessary by parent-owned reproduction
  - keep the explanation machine-checkable when advisory fallback is suppressed or unused
- Interfaces / contracts:
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - top-level tracked payload used by `co-status`, `/api/v1/state`, and `/ui/data.json`

## Architecture & Data

- Architecture / design adjustments:
  - keep `linear-advisory-state.json` as bounded fallback only
  - enforce authoritative tracked-state precedence before top-level `tracked.linear` is exposed
  - share one tracked-truth contract across CLI/API/UI surfaces so stale fallback cannot leak through only one path
- Data model changes / migrations:
  - none required for the docs packet
  - parent implementation should prefer additive helper or precedence logic over broad dispatch redesign unless required by reproduction evidence
- External dependencies / integrations:
  - focused `ControlRuntime` and `SelectedRunProjection` coverage
  - any parent-selected API/UI alignment coverage needed to keep `/api/v1/state` and `/ui/data.json` honest

## Validation Plan

- Child-lane checks:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - protected-term grep across the touched packet files
  - `git diff --check -- docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md docs/TECH_SPEC-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md .agent/task/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md tasks/index.json docs/docs-freshness-registry.json`
- Parent implementation:
  - focused `orchestrator/tests/ControlRuntime.test.ts`
  - focused `orchestrator/tests/SelectedRunProjection.test.ts`
  - any parent-selected alignment coverage for `co-status`, `/api/v1/state`, and `/ui/data.json`
  - parent-owned docs-review and `node scripts/spec-guard.mjs --dry-run`
- Rollout verification:
  - parent records the reproduced stale tracked leak and the repaired current-truth-or-empty behavior
  - parent records explicit separation from `CO-219`, `CO-220`, and `CO-222`

## Open Questions

- Should the fail-closed empty/null rule live in `controlRuntime.ts`, `selectedRunProjection.ts`, or a new shared tracked-authority helper?
- When dispatch and provider intake disagree, what is the smallest truthful precedence rule that keeps all three surfaces aligned?
- Does parent validation need one explicit `/api/v1/state` or `/ui/data.json` regression beyond `ControlRuntime` and `SelectedRunProjection`?

## Approvals

- Reviewer: pending parent docs-review / implementation.
- Date: 2026-04-18.
