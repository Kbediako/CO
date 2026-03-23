---
id: 20260322-1318-coordinator-symphony-current-linear-operational-parity
title: Coordinator Symphony Current Linear Operational Parity
status: in_progress
owner: Codex
created: 2026-03-22
last_review: 2026-03-22
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-current-linear-operational-parity.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-current-linear-operational-parity.md
related_tasks:
  - tasks/tasks-1318-coordinator-symphony-current-linear-operational-parity.md
review_notes:
  - 2026-03-22: Opened after live CO monitoring proved a succeeded `CO-1` child run can still leave the Linear issue in `In Progress`, which is inconsistent with current Symphony operational behavior even though the earlier `1310` core-spec truthfulness result remains valid.
  - 2026-03-22: Current Symphony audit shows the base `SPEC.md` still treats tracker writes as worker-owned optional capability, but current Elixir operational behavior relies on that capability through `WORKFLOW.md`, `README.md`, `linear_graphql`, the repo-local `linear` skill, and live E2E coverage.
  - 2026-03-22: Current CO audit shows provider lifecycle parity remains read-only: query-only Linear source, no mutation surface, no persistent workpad contract, no Human Review/Merging/Rework/Done workflow semantics, and no provider-owned ticket-write evidence in observability.
  - 2026-03-22: This lane now moves into implementation with a narrow worker-owned Linear helper surface, shared workflow-state classification, and no generic run-completion write-back.
  - 2026-03-22: `docs-review`, `docs:check`, and `docs:freshness` passed for the planning packet in `.runs/1318-coordinator-symphony-current-linear-operational-parity/cli/2026-03-22T08-53-40-103Z-9a43d120/manifest.json`; the review found no diff-local inconsistency in the registration/docs packet.
  - 2026-03-22: Live `CO-1` issue-context proof showed the current team exposes `In Review` instead of `Human Review`, so the implementation and proof path must treat `In Review` as the immediate review-handoff alias while keeping Symphony's canonical workflow naming intact.
  - 2026-03-22: The crash recovery restart initially came back on `--pipeline diagnostics`; final live parity proof for this lane must run through the control-host's `provider-linear-worker` pipeline instead so the worker mutation path is actually exercised.
  - 2026-03-22: The current branch now includes the worker-visible Linear CLI/facade, remote-first workpad path, prompt/workflow contract, provider handoff classifier, and helper-operation attempt/outcome proof trail; remaining work is clean validation plus live worker-path proof and merge closeout.
---

# Technical Specification

## Context

CO now matches much of Symphony's scheduler/read-side behavior, but not the current Symphony operator experience for Linear-managed unattended work. The latest live symptom made that visible: a CO child run can succeed locally while the Linear ticket stays active. The root cause is not simply "missing post-run write-back". Current Symphony operational behavior is defined by agent-owned Linear workflow tooling and prompts, while CO still lacks that entire layer.

## Requirements

1. Preserve the authority split explicitly:
   - base `SPEC.md` remains the scheduler/core contract
   - current Elixir workflow/tooling remains the operational parity target
2. Plan a worker-visible Linear mutation substrate equivalent to current Symphony's `linear_graphql` or repo-local Linear skill path.
3. Plan provider worker workflow prompt parity for:
   - unattended execution
   - state routing
   - one persistent workpad comment
   - PR attachment/review sweep
   - `Human Review` or live-team `In Review`, plus `Merging`, `Rework`, and `Done` handoffs
4. Implement remote-first workpad continuity so continuation turns update the same Linear artifact rather than duplicating it.
5. Implement provider lifecycle behavior for non-active handoff states and terminal states under the new workflow.
6. Surface enough observability or proof detail for ticket-write attempts and outcomes.
7. Validate locally and against one live Linear proof.

## Current Truth

- Current Symphony:
  - `SPEC.md` says ticket writes are typically performed by the coding agent and that first-class orchestrator tracker writes remain future work.
  - Elixir `WORKFLOW.md` operationalizes that with explicit Linear status transitions and workpad ownership.
  - `README.md` tells adopters to copy `WORKFLOW.md` and the `linear` skill, and notes the `linear` skill expects `linear_graphql`.
  - `live_e2e_test.exs` explicitly requires comment creation and issue completion through `linear_graphql`.
- Current CO:
  - `linearDispatchSource.ts` is query-only.
  - `providerIssueHandoff.ts` owns local claim/retry/reconcile state only.
  - `providerLinearWorkerRunner.ts` prompt is thin and mutation-agnostic.
  - run finalization writes only local manifest/run-summary state.
- Current `1318` branch:
  - adds `codex-orchestrator linear ...` worker-facing reads/writes backed by the shared GraphQL client
  - adds remote-first `## Codex Workpad` ownership and PR attachment/update support
  - adds provider worker prompt parity and `Human Review`/`In Review` handoff classification
  - still needs clean validation and live `provider-linear-worker` proof before closeout

## Validation Plan

- Docs lane:
  - keep PRD, TECH_SPEC, ACTION_PLAN, checklist, `.agent` mirror, task registry, docs snapshot, and freshness registry aligned as implementation decisions harden
  - rerun docs checks after implementation edits
- Implementation lane:
  - full validation floor
  - live Linear proof through `provider-linear-worker` covering state transitions, comment/workpad ownership, PR attachment, and handoff consistency
