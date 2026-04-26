---
id: 20260423-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7
title: "CO-331 queue cap and follow-up admission truth"
relates_to: docs/PRD-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7.md
risk: high
owners:
  - Codex
last_review: 2026-04-23
---

# Technical Spec: CO-331 queue cap and follow-up admission truth

## Scope

- Task id: `linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- Registry id: `20260423-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- Linear issue: `CO-331`
- Issue id: `9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- PRD: `docs/PRD-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7.md`
- Action plan: `docs/ACTION_PLAN-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7.md`

## Source Anchor

- Pointer: `ctx:sha256:baea476992e02ddae2d101831f55c08787b93c5aefb8b73b992a2ac1d788fabd#chunk:c000001`
- Object id: `sha256:baea476992e02ddae2d101831f55c08787b93c5aefb8b73b992a2ac1d788fabd`
- Declared payload: `.runs/linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7/cli/2026-04-23T08-13-32-404Z-6a3dbcd8/memory/source-0/source.txt`
- Manifest: `.runs/linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7/cli/2026-04-23T08-13-32-404Z-6a3dbcd8/manifest.json`

## Target Contract

1. `operator-autopilot` must not auto-promote helper-created follow-up issues from `Backlog` to `Ready` while their traceability packet still says setup must occur before leaving `Backlog`.
2. Provider admission must count resumable claims and queued retry claims as capacity-occupying active work for `max_allowed`.
3. Provider intake summaries used by operator surfaces must include queued retry work in active issue identifiers when it still occupies capacity.
4. Operator-facing hold/block reasons must identify the specific follow-up or capacity reason instead of silently drifting.

## Implementation Surfaces

- `orchestrator/src/cli/control/providerOperatorAutopilot.ts`
  - Detect helper-created follow-up issues through the follow-up traceability text already emitted by `createProviderLinearFollowUpIssue`.
  - Add a backlog promotion hold record for traceability-pending follow-ups rather than transitioning them to `Ready`.
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - Share or add a predicate for capacity-occupying provider intake claims.
  - Include resumable claims and queued retry claims in direct admission occupancy before fresh issue admission.
- `orchestrator/src/cli/control/providerIntakeState.ts`
  - Align active summary projection with queued retry occupancy where terminal-looking rows still have retry work pending.
- Tests:
  - `orchestrator/tests/ProviderOperatorAutopilot.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderIntakeState.test.ts` when summary projection changes.

## Current / Reference / Target Matrix

| Surface | Current | Reference | Target |
| --- | --- | --- | --- |
| `Backlog` to `Ready` autopromotion | Any safe backlog head can move to `Ready`. | Helper-created follow-ups explicitly require packet and mirror setup before leaving `Backlog`. | Follow-up traceability-pending issues are held in `Backlog` with operator-visible evidence. |
| Resumable capacity | Resumable rows can be outside direct admission occupancy. | Resumable claims are active queue ownership. | Resumable rows consume `max_allowed` capacity. |
| Queued retry capacity | Retry-queued terminal or handoff rows can be outside direct admission occupancy. | Retry work remains active until exhausted or released. | Queued retry rows consume `max_allowed` capacity and appear in active summaries. |
| Active issue identifiers | Active surfaces can disagree under retry/resume recovery. | `provider-intake-state.json` and `co-status` should explain the same active set. | Summary projection and admission use the same occupancy contract. |

## Regression Requirements

- A `Backlog` issue with helper-created follow-up traceability text is not transitioned to `Ready` by backlog promotion.
- A normal eligible `Backlog` issue without follow-up hold text can still be promoted when capacity and policy allow it.
- A queued retry claim counts against admission capacity even if its state is no longer `running`.
- A resumable claim counts against admission capacity.
- Summary active issue identifiers include queued retry capacity occupants.

## Validation Plan

- Focused unit tests for the changed surfaces.
- `node scripts/delegation-guard.mjs`.
- `node scripts/spec-guard.mjs --dry-run`.
- `npm run build`.
- `npm run lint`.
- `npm run test`.
- `npm run docs:check`.
- `npm run docs:freshness`.
- `npm run repo:stewardship`.
- `node scripts/diff-budget.mjs`.
- Manifest-backed standalone review and explicit elegance pass before review handoff.

## Review Notes

- 2026-04-23: Lightweight issue-quality review approved this spec against the full user request: follow-up issue admission, retry/resumable occupancy, provider intake state, `co-status`, and `max_allowed` must remain aligned.
- 2026-04-23: Manifest-backed standalone review completed with `status: succeeded` and `review_outcome: bounded-success` after command-intent retry; explicit elegance/minimality pass found no avoidable abstraction or unrelated branch scope.
