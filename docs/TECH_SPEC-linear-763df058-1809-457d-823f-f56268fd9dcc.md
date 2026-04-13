---
id: 20260409-linear-763df058-1809-457d-823f-f56268fd9dcc
title: CO Evaluate Telemetry-First Dynamic Provider-Worker Reasoning Selection After Docs-First Approval
relates_to: docs/PRD-linear-763df058-1809-457d-823f-f56268fd9dcc.md
risk: high
owners:
  - Codex
last_review: 2026-04-12
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-763df058-1809-457d-823f-f56268fd9dcc.md`
- PRD: `docs/PRD-linear-763df058-1809-457d-823f-f56268fd9dcc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-763df058-1809-457d-823f-f56268fd9dcc.md`
- Task checklist: `tasks/tasks-linear-763df058-1809-457d-823f-f56268fd9dcc.md`

## Traceability
- Linear issue: `CO-17` / `763df058-1809-457d-823f-f56268fd9dcc`
- Linear URL: https://linear.app/asabeko/issue/CO-17/co-evaluate-telemetry-first-dynamic-provider-worker-reasoning

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: produce a truthful docs-first recommendation on whether CO should ever support dynamic per-issue provider-worker reasoning selection, while preserving the current docs-first `xhigh` baseline and rejecting estimate-driven routing without telemetry truth.
- Scope:
  - baseline audit of the current reasoning-default, runtime-launch, proof-telemetry, and Linear-dispatch seams
  - live confirmation of the CO team estimation posture
  - comparison against adjacent landed provider-worker backlog (`CO-10`, `CO-11`, `CO-12`, `CO-13`, `CO-16`)
  - explicit recommendation plus staged future experiment design if the idea remains worth revisiting
- Constraints:
  - keep the lane documentation-only
  - do not ship reasoning selection in this issue
  - preserve docs-first authoring at `xhigh`
  - keep any future override manifest-backed and auditable

## Technical Requirements
- Functional requirements:
  - document clearly whether dynamic provider-worker reasoning selection is worth doing at all for CO
  - confirm the live CO team estimation posture before making estimate-driven recommendations
  - preserve the current docs-first authoring baseline at highest reasoning (`xhigh`)
  - if the recommendation stays open for later, define a staged experiment:
    - truthful token telemetry aggregation first
    - explicit issue/run reasoning metadata second
    - bounded human-auditable override pilot third
  - require any future override to use manifest-backed per-run env/config overrides such as `CODEX_CONFIG_OVERRIDES`
  - explicitly state that dispatch ordering does not change in this lane
- Non-functional requirements (performance, reliability, security):
  - keep recommendations grounded in current repo truth and live Linear posture
  - avoid overclaiming current token telemetry as scheduler-grade launch input
  - avoid widening the provider-worker authority model
- Interfaces / contracts:
  - baseline defaults contract: `orchestrator/src/cli/codexDefaultsSetup.ts`, `AGENTS.md`
  - launch/runtime contract: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/runtime/codexCommand.ts`, `orchestrator/src/cli/runtime/provider.ts`
  - Linear tracked-issue contract: `orchestrator/src/cli/control/linearDispatchSource.ts`
  - issue/workpad helper contract: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - future override carrier: `CODEX_CONFIG_OVERRIDES`, `CODEX_MCP_CONFIG_OVERRIDES`

## Architecture & Data
- Architecture / design adjustments:
  - no runtime or workflow behavior changes land in this issue
  - the packet records a deferred recommendation: keep current global `xhigh` defaults for docs-first and ordinary provider-worker launches today
  - future experimentation, if any, must add explicit issue/run metadata rather than inferring from queue order or global config mutation
  - future reasoning overrides should be applied at launch via manifest-backed env/config overrides, not by mutating global defaults
- Data model changes / migrations:
  - none in this lane
  - future pilot requires a new issue/run reasoning metadata contract plus truthful token-telemetry aggregation that can be audited per run
- External dependencies / integrations:
  - live Linear team settings queried through the repo Linear GraphQL client
  - adjacent provider-worker packet docs for `CO-10`, `CO-11`, `CO-12`, `CO-13`, and `CO-16`

## Validation Plan
- Tests / checks:
  - create and register the docs packet plus mirrored checklist
  - maintain the required single Linear workpad comment with current status
  - run an audited `docs-review` child stream for the packet
  - run the repo validation floor needed for a docs-only diff before review handoff
- Rollout verification:
  - confirm the source audit still shows global `xhigh` defaults and no issue-level reasoning selection
  - confirm live Linear still reports `issueEstimationType = "notUsed"`
  - confirm the packet recommendation preserves docs-first `xhigh`, manifest-backed override auditability, and no dispatch-order change
- Monitoring / alerts:
  - use the Linear workpad for operator-facing progress
  - use the baseline audit artifact plus docs-review manifest as the authoritative evidence bundle

## Open Questions
- Whether future reasoning metadata should remain provider-worker-local or be added to the broader tracked-issue contract once telemetry truth is good enough. The packet should frame both options but keep implementation deferred.

## Approvals
- Reviewer: Pending `docs-review`
- Date: 2026-04-09

## Manifest Evidence
- Baseline audit: `out/linear-763df058-1809-457d-823f-f56268fd9dcc/manual/20260409T083959Z-baseline-audit.md`
