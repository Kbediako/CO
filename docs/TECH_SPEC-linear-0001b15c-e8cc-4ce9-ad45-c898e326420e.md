---
id: 20260408-linear-0001b15c-e8cc-4ce9-ad45-c898e326420e
title: CO STATUS: finish post-CO-103 Symphony parity for Agents, live runtime ticking, and EVENT truth
relates_to: docs/PRD-linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md
risk: high
owners:
  - Codex
last_review: 2026-04-08
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`
- PRD: `docs/PRD-linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`
- Task checklist: `tasks/tasks-linear-0001b15c-e8cc-4ce9-ad45-c898e326420e.md`

## Traceability
- Linear issue: `CO-107` / `0001b15c-e8cc-4ce9-ad45-c898e326420e`
- Linear URL: https://linear.app/asabeko/issue/CO-107/co-status-finish-post-co-103-symphony-parity-for-agents-live-runtime
- Follow-up to: `CO-103` / `f71992e3-ddda-4198-b43c-97ccb36908cf`

## Summary
- Objective: finish the bounded post-`CO-103` STATUS parity remainder for `Agents`, local live runtime ticking, and message-first `EVENT` truth.
- Scope:
  - expose `max_allowed` from the live concurrency contract and render `running/max_allowed`
  - derive cached-frame reference time from a live wall-clock anchor so `Runtime`, `AGE / TURN`, and relative event age continue to advance every second
  - tighten upstream running-event authorship so `display_event` is the authoritative message-first STATUS surface
  - add focused regression coverage and close with real-device screenshot proof
- Constraints:
  - no unrelated rate-limit, token/session, attach-viewer, paused-scrollback, or HTTP dashboard redesign work
  - renderer should become thinner, not gain more fallback heuristics

## Implementation Boundary
- Read-model / payload:
  - add the smallest truthful field needed to carry `max_allowed` from the existing provider concurrency contract into the compatibility/operator dataset
  - keep the source aligned with the same `max_concurrent_agents` contract already used by provider admission logic
- Runtime / projection:
  - compute authoritative running `display_event` upstream with message/progress precedence
  - preserve raw event and timestamp for secondary semantics and debugging
- Dashboard:
  - render `Agents` with the new denominator
  - render runtime/age/recency against a live local reference time on cached redraws
  - prefer authoritative `display_event` and only fall back when upstream truth is genuinely absent

## Design
- `Agents` denominator:
  - use the same provider poll agent concurrency contract that currently controls provider admission (`max_concurrent_agents`)
  - do not reuse `counts.issues` or tracked issue count as a proxy
- Live ticking:
  - retain the dataset snapshot as the authoritative payload
  - store a snapshot wall-clock anchor when the dataset is read
  - on cached rerenders, derive a fresh reference time from current wall-clock elapsed time relative to the original snapshot anchor
  - use that live reference time when formatting header `Runtime`, row `AGE / TURN`, and relative event age
- `EVENT` truth:
  - keep `compatibilityIssuePresenter.ts` as the authoritative seam for message-first running event text
  - treat `controlStatusDashboard.ts` as a formatter over `display_event`, raw event, and timestamp rather than as a semantic decider
  - generic phrases such as `turn running` or `provider worker turn is active` remain legal only when no richer authoritative message/progress text exists

## Validation
- `linear child-stream --pipeline docs-review`
- focused regressions in:
  - `orchestrator/tests/CompatibilityIssuePresenter.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/ControlStatusDashboard.test.ts`
- full repo validation floor before review handoff
- real-device screenshots embedded directly in Linear showing corrected `Agents`, live ticking, and `EVENT`

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream failed only on repo-wide `docs:freshness` baseline after `spec-guard` and `docs:check` passed; manual fallback accepted
- Date: 2026-04-08
- Manifest: `/Users/kbediako/Code/CO/.workspaces/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/.runs/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e-docs-review/cli/2026-04-07T14-44-58-689Z-5944f158/manifest.json`
- Review telemetry: fallback note at `out/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e/manual/20260407T144500Z-docs-review-fallback.md`
