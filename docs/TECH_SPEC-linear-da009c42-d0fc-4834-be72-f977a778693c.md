---
id: 20260409-linear-da009c42-d0fc-4834-be72-f977a778693c
title: CO-102: recover active In Progress worker claims when control-host refresh path times out repeatedly under live PR completion pressure
relates_to: docs/PRD-linear-da009c42-d0fc-4834-be72-f977a778693c.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-da009c42-d0fc-4834-be72-f977a778693c.md`
- PRD: `docs/PRD-linear-da009c42-d0fc-4834-be72-f977a778693c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-da009c42-d0fc-4834-be72-f977a778693c.md`
- Task checklist: `tasks/tasks-linear-da009c42-d0fc-4834-be72-f977a778693c.md`

## Traceability
- Linear issue: `CO-119` / `da009c42-d0fc-4834-be72-f977a778693c`
- Linear URL: https://linear.app/asabeko/issue/CO-119/co-102-recover-active-in-progress-worker-claims-when-control-host
- Related lanes:
  - `CO-102` / `f0d312eb-055f-4926-80df-8fcaaf56839c`
  - `CO-104` / `8ef95d79-db42-411c-886c-99bdeee6492b`
  - `CO-116` / `a770da1f-7a08-499d-a680-7f1cd8eee4ad`
  - `CO-81` / `529457d9-5636-4394-a21e-b96e4f4fae74`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make late-turn control-host refresh requests truthful and fast enough that provider-worker active-claim recovery does not stay pinned in `In Progress` under repeated timeout bursts.
- Scope:
  - docs-first packet registration for `CO-119`
  - one bounded refresh acknowledgement seam in the control-host/public lifecycle and provider-worker refresh caller contract
  - focused proof and health-truth preservation
  - focused regressions for queued/coalesced refresh acknowledgement and late-turn recovery
  - required validation and review gates
- Constraints:
  - preserve actual stuck/restart-required truth
  - preserve the existing attached-PR disambiguation path from `CO-104`
  - avoid broad workflow redesign or generic polling-budget work

## Technical Requirements
- Functional requirements:
  - repeated late-turn refresh requests from `provider-linear-worker` must not time out merely because the control-host already has matching refresh work queued or running
  - the control-host refresh/public lifecycle must return a prompt accepted result for queued/coalesced work while preserving enough metadata for auditability
  - genuinely stuck control-host lifecycles must still expose `provider_refresh_lifecycle_stuck` / `restart_required` truth
  - provider-worker claim recovery must continue to the truthful next state once the active PR and issue state are actually ready
  - historical attached PRs must remain disambiguated on the existing bounded path rather than poisoning the recovered flow
  - focused tests must cover queued/coalesced acceptance, explicit stuck truth, and the archived late-turn recovery shape
- Non-functional requirements:
  - keep the implementation additive and narrow
  - prefer reusing existing refresh queue/coalescing state over inventing a second queue
  - preserve existing worker-side timeout behavior as a detector for actually unresponsive refresh requests unless a stronger design reason emerges
- Interfaces / contracts:
  - refresh request caller: `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - refresh/public lifecycle: `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - late-turn claim routing: `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - stuck/restart-required classifier: `orchestrator/src/cli/control/providerPollingHealth.ts`

## Architecture & Data
- Architecture / design adjustments:
  - teach the refresh/public lifecycle to distinguish "accepted because work is already queued/coalesced" from "accepted after work fully completed" so the caller can stop treating the former as failure
  - keep actual lifecycle execution and stuck detection where they already live; adjust only the caller-facing acknowledgement path
  - preserve existing attached-PR selection and workflow-state routing outside the refresh seam
- Data model changes / migrations:
  - no schema migration expected
  - proof, logs, or returned refresh payload may gain explicit queued/coalesced acknowledgement details if needed for testability and auditability
- External dependencies / integrations:
  - live Linear issue/transition reads already used by provider handoff
  - archived run evidence under `/Users/kbediako/Code/CO/.runs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c/cli/2026-04-08T22-32-52-844Z-c8d26259/`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused `ControlServerPublicLifecycle.test.ts` coverage for queued/coalesced accepted refresh requests
  - focused `ProviderLinearWorkerRunner.test.ts` coverage showing provider refresh calls stop timing out when the control-host is busy-but-healthy
  - `ProviderIssueHandoffRefreshSerialization.test.ts` or `ProviderIssueHandoff.test.ts` coverage if late-turn claim routing needs explicit recovery assertions
  - `ProviderPollingHealth.test.ts` if stuck/restart-required shaping changes
  - required repo validation floor after implementation
  - manifest-backed standalone review followed by explicit elegance review before handoff
- Rollout verification:
  - confirm the archived late-turn shape is covered by tests: refresh requests burst while the source lane can still advance through handoff
  - confirm genuine stuck lifecycle truth still fails closed
- Monitoring / alerts:
  - rely on provider-worker proof/events plus control-host stuck/restart-required surfaces

## Open Questions
- Resolved 2026-04-09: the bounded fix should target prompt accepted responses for queued/coalesced refresh work, not a generic timeout increase.

## Approvals
- Reviewer: `codex-orchestrator docs-review (repo docs:freshness baseline; manual fallback accepted)` at `.runs/linear-da009c42-d0fc-4834-be72-f977a778693c-docs-review/cli/2026-04-10T06-30-27-538Z-4c8a90d9/manifest.json`; the rerun passed delegation guard, `spec-guard --dry-run`, and `docs:check`, then failed only on the unrelated repo-wide `docs:freshness` baseline (`stale docs: 119`), so the CO-119 packet was accepted as truthful manual fallback rather than treated as a packet-shape defect.
- Date: 2026-04-10
