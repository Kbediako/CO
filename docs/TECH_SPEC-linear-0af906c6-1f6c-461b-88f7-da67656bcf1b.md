---
id: 20260409-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b
title: CO: add operator autopilot so queue shepherding can run outside a single interactive turn
relates_to: docs/PRD-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`
- PRD: `docs/PRD-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`
- Task checklist: `tasks/tasks-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`

## Traceability
- Linear issue: `CO-118` / `0af906c6-1f6c-461b-88f7-da67656bcf1b`
- Linear URL: https://linear.app/asabeko/issue/CO-118/co-add-operator-autopilot-so-queue-shepherding-can-run-outside-a
- Related lanes:
  - `CO-116` / `a770da1f-7a08-499d-a680-7f1cd8eee4ad`
  - `CO-111` / `ff81e5d8-2760-41ec-bdbb-5509ae2faade`
  - `CO-113`
  - `CO-115` / `bf0ba9ec-47f0-45ac-be83-490df0f0b45d`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: add a repo-tracked operator-autopilot policy layer that runs inside the control-plane refresh loop and can keep queue shepherding alive without a human keeping one interactive turn open.
- Scope:
  - docs-first packet registration for `CO-118`
  - repo-configured operator-autopilot metadata under the provider workflow config
  - bounded control-plane autopilot execution for backlog promotion, review-handoff rework decisions, and post-merge pending-action surfacing
  - structured control-plane audit output and focused tests
  - required validation and review gates
- Constraints:
  - preserve existing review-promotion and merge-closeout safety
  - keep host supervision and operator policy as separate code surfaces
  - fail closed on ambiguous queue or PR truth

## Technical Requirements
- Functional requirements:
  - the control-plane must expose a repo-tracked operator-autopilot mode in the provider workflow metadata
  - when operator autopilot is enabled, each refresh cycle must be able to evaluate live tracked issues and take bounded operator actions without a human chat turn
  - backlog promotion must reuse the existing tracked-issue dispatch ordering, must only promote the highest-ranked backlog issue when no earlier blocked lane still owns the queue head, and must only mutate a backlog head owned by the current viewer or left unassigned
  - provider-owned review handoffs with existing author-action-required blocker truth must be able to move into `Rework`
  - existing clean review handoffs must continue using the already-landed `CO-116` promotion into `Merging`
  - the autopilot must write durable structured results that explain actions taken, holds, and pending post-merge rollout actions
- Non-functional requirements:
  - keep the first slice bounded to control-plane policy and audit surfaces
  - prefer reuse of current issue/PR truth sources over duplicate heuristics
  - avoid emitting noisy duplicate audit records when the autopilot result has not meaningfully changed
- Interfaces / contracts:
  - control seam: `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - queue-order seam: `orchestrator/src/cli/control/linearDispatchSource.ts`
  - review/merge truth seam: `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - repo-config seam: `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`
  - runtime observability seam: `orchestrator/src/cli/control/observabilityReadModel.ts`

## Architecture & Data
- Architecture / design adjustments:
  - add a dedicated operator-autopilot control module under `orchestrator/src/cli/control/` instead of hiding policy inside the host lifecycle shell
  - invoke that module from the provider-issue refresh cycle after claim reconciliation and before fresh dispatch candidate launch
  - extend the provider workflow payload to include operator-autopilot config and the latest structured result so observability surfaces can project it directly
  - store detailed cycle/action audit records in the control-host run directory so long-running windows stay auditable
- Data model changes / migrations:
  - extend the provider workflow payload with `operator_autopilot`
  - persist a latest operator-autopilot result plus append-only cycle/action records under the control-host run directory
  - no migration of existing provider-intake claim schema is required for the first slice
- External dependencies / integrations:
  - `transitionProviderLinearIssueState(...)` from `providerLinearWorkflowFacade.ts`
  - existing `runProviderReviewHandoffPromotion(...)` and merge-closeout claim truth from `providerMergeCloseout.ts`
  - existing tracked issue blocker metadata from `linearDispatchSource.ts`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused unit coverage for operator-autopilot queue decisions and review-handoff rework decisions
  - focused `ProviderIssueHandoff.test.ts` coverage proving the autopilot runs from refresh without regressing existing handoff logic
  - required repo validation floor after implementation
  - manifest-backed standalone review followed by explicit elegance review before handoff
- Rollout verification:
  - prove a backlog head can move from `Backlog` into the queued state only when unblocked, in order, and owned by the current viewer or left unassigned
  - prove a provider-owned review handoff with author-action-required blocker truth can move into `Rework`
  - prove `label:do-not-merge` and `required_checks_query_failed` remain review holds rather than `Rework`
  - prove a pending local rollout action is surfaced after merge-closeout truth lands
- Monitoring / alerts:
  - rely on control-host manifest output plus structured autopilot result payloads and audit logs

## Open Questions
- For the first shipped slice, JSON/manifest projection plus run-dir audit is sufficient; interactive `co-status` surfacing can stay a follow-up if the resulting payload is hard to inspect in practice.

## Approvals
- Reviewer: Codex manual docs-review fallback after `docs-review` child stream `.runs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b-co-118-docs-review-r2/cli/2026-04-09T09-04-17-041Z-fb44e299/manifest.json` failed as `review_outcome=failed-other` because the reviewer model was at capacity; no additional spec issues found beyond the earlier ownership and `Rework`-scope corrections already applied.
- Date: 2026-04-09
