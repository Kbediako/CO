---
id: 20260415-linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d
title: CO: reclaim Ready released-pending-reopen issues after blockers clear
relates_to: docs/PRD-linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md
risk: high
owners:
  - Codex
last_review: 2026-04-15
---

## Canonical Spec
- Implementation contract: `tasks/specs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`
- PRD: `docs/PRD-linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`
- Action plan: `docs/ACTION_PLAN-linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`
- Checklist: `tasks/tasks-linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`

## Scope
- Runtime code: `orchestrator/src/cli/control/providerIssueHandoff.ts`; only touch `controlRuntime.ts` if status reason projection needs explicit support.
- Tests: `orchestrator/tests/ProviderIssueHandoff.test.ts` and existing `orchestrator/tests/ControlRuntime.test.ts` CO-189 coverage.
- Preserve blocker checks, same-issue live-worker checks, dirty workspace contents, and provider admission caps.

## Required Behavior
- A Ready/unstarted issue with terminal blockers, no active claim, no live worker, no retry queued, and a retained `released` claim reason `provider_issue_released_pending_reopen:provider_issue_released:not_active` is not indefinitely suppressed.
- Refresh deferral must not cause a released pending-reopen claim to block its own fresh-discovery candidate when that candidate is eligible to reclaim.
- Reclaim uses the existing tracked issue launch/requeue path and preserves all normal admission/cap checks.
- Dirty workspace contents remain untouched during reclaim.
- Live same-issue worker evidence still blocks duplicate launch/resume and remains covered by CO-189 behavior.
- Provider-intake/CO STATUS debug reason text distinguishes blocker wait, live-worker wait, eligible-for-reclaim, and reclaim-launched states.

## Non-Goals
- No scheduler redesign, Linear workflow mutation, request-budget expansion, dirty workspace deletion, or display-only CO STATUS masking.
- Do not weaken no-burn retained-release protections for blocked, terminal, or live-worker cases.

## Validation
- Focused provider handoff regression covers the CO-191 Ready released-pending-reopen shape with terminal blockers, dead/no worker PID, no retry queued, and dirty workspace preservation.
- Existing pending-reopen reopen coverage still passes.
- Existing CO-189 live-worker rehydration/status coverage still passes.
- Required handoff gates remain: delegation evidence, spec guard, build, focused tests, standalone review, and elegance review before review transition.
