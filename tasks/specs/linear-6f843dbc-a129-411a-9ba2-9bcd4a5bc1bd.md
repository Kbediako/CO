---
id: 20260408-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd
title: CO: Make ordinary eligible provider-worker issues actually leverage parent-owned same-issue child-lane parallelisation
status: done
owner: Codex
created: 2026-04-08
last_review: 2026-05-12
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md
related_action_plan: docs/ACTION_PLAN-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md
related_tasks:
  - tasks/tasks-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md
review_notes:
  - 2026-04-08: Live `linear issue-context` confirmed the CO workflow states (`Ready`, `In Progress`, `In Review`, `Merging`, `Rework`, `Done`), the issue moved from `Ready` to `In Progress`, branch `linear/co-101-child-lane-adoption` was created from `025efb2362429ccc3455cc71aa40a52f7b7ac652`, and the single required `## Codex Workpad` comment was bootstrapped as Linear comment `e5f14bce-7a82-4b55-b609-0b74bb8f07cc`.
  - 2026-04-08: Baseline audit confirmed the ordinary provider-worker contract still only instructs child-lane use "when the issue benefits" inside `buildProviderWorkerPrompt(...)`, while `provider-linear-worker-proof.json` already hydrates `child_streams`, `child_lanes`, and the `CO-82` debug snapshot from sanctioned persisted sources.
  - 2026-04-08: Required predecessor slices are already present in the active tree and must be reused directly: `CO-35` child-lane runtime and parent authority, `CO-52` phase-path verification, `CO-56` workspace-scoped delegation evidence, `CO-68` shared child-lane parsing helper, and `CO-82` proof/debug observability surfaces.
  - 2026-04-08: Pre-implementation approval is the narrow ordinary-adoption seam only: add one structured parent-only ordinary-worker decision helper plus bounded reason codes, hydrate that decision into proof/debug surfaces through the existing audit refresh path, and fail the worker turn closed when `parallelize_now` does not launch a child lane or when no explicit decision exists.
  - 2026-04-08: The first audited `docs-review` child stream failed only because `docs/TASKS.md` exceeded the archive-policy line cap by one line. After `npm run docs:archive-tasks` trimmed `docs/TASKS.md` from `451` to `450` lines, the rerun passed `spec-guard` and `docs:check` and then failed only on the standing repo-wide `docs:freshness` baseline (`Task Packet 205`, `Task Mirror 41`, `Report Only 36`). None of the CO-101 packet paths appear in the stale-entry list, so the rerun is recorded as a truthful manual fallback instead of a packet-shape blocker. Evidence: `.runs/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd-co-101-docs-review-rerun/cli/2026-04-08T02-39-52-501Z-2a53de89/manifest.json`, `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T024100Z-docs-review-fallback.md`.
  - 2026-05-12: CO-523 live Linear audit verified CO-101 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: .runs/linear-8573da42-d9f9-44ce-a24e-224984539044/cli/2026-05-12T18-47-35-293Z-376d8842/provider-linear-issue-context-cache-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.json.
---

# Technical Specification

## Context

`CO-35` proved the parent-owned same-issue child-lane runtime is real, but ordinary `provider-linear-worker` execution still treats child-lane use as optional prompt advice. That leaves the capability latent in ordinary issue work:

- one external owner still exists per issue (`control-host` -> `provider-linear-worker`)
- child-lane launch, acceptance, rejection, invalidation, phase verification, parsing, and delegation evidence already exist
- ordinary proof artifacts still allow `child_lanes: []` with no explicit explanation

`CO-101` closes that ordinary-adoption gap without reopening the child-lane runtime architecture.

## Requirements

1. Define one explicit repo-local ordinary-worker decision contract: `parallelize_now`, `stay_serial`, or `forbid_parallel`.
2. Persist a machine-checkable reason code plus human summary for the current decision in existing proof/debug surfaces.
3. When the current decision is `parallelize_now`, the ordinary parent worker must actually launch at least one bounded same-issue child lane during the turn.
4. When the current decision is `stay_serial` or `forbid_parallel`, the current proof/debug surfaces must make `child_lanes: []` explicit rather than silent.
5. Reuse `CO-35`, `CO-52`, `CO-56`, `CO-68`, and `CO-82` instead of re-implementing runtime, verification, delegation, parsing, or observability contracts.
6. Capture ordinary replay or proof evidence for both the parallelized and explicit serial/no-go paths.

## Ordinary Execution Contract

- Parent-only decision surface:
  - add one parent-only packaged `linear` helper that records the current-turn decision, reason code, and summary
  - the helper is available only to the parent `provider-linear-worker`, not subordinate child lanes
- Decision values:
  - `parallelize_now`
  - `stay_serial`
  - `forbid_parallel`
- Allowed reason codes:
  - `parallelize_now`: `independent_scope_available`
  - `stay_serial`: `single_bounded_change`, `overlapping_scope`, `existing_child_lane_active`, `review_or_validation_only`
  - `forbid_parallel`: `parent_only_mutation`, `merge_or_handoff_state`, `blocked_by_dependency`
- Hydration and observability:
  - persist the decision through the existing provider audit stream
  - hydrate the latest decision into `provider-linear-worker-proof.json`
  - expose the hydrated decision, reason, summary, and recorded child-lane count in `provider_debug_snapshot`
- Turn enforcement:
  - every active ordinary turn must end with an explicit decision
  - if the decision is `parallelize_now` and no child lane is recorded for the turn, the parent worker fails closed
  - if no decision is recorded by turn end, the parent worker fails closed

## Planned Implementation

1. Extend provider audit typing and packaged `linear` CLI routing with a parent-only `parallelization` helper.
2. Hydrate the latest recorded decision from audit summaries into `ProviderLinearWorkerProof`.
3. Project that decision into `provider_debug_snapshot` alongside the recorded child-lane count.
4. Tighten `buildProviderWorkerPrompt(...)` so the worker must record the current-turn decision explicitly and understand the fail-closed rule for `parallelize_now` without launched child lanes.
5. Enforce the missing-decision and missing-launch cases in `runProviderLinearWorker(...)`.
6. Add focused regressions plus ordinary replay artifacts for the successful parallel and explicit serial/no-go paths.

## Validation Plan

- Docs review:
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-101-docs-review --format json`
  - manual fallback is acceptable only if the rerun clears `spec-guard` and `docs:check` and then fails solely on the standing repo-wide `docs:freshness` stale-doc baseline, with no CO-101 packet paths listed in the stale-entry report
- Focused regressions:
  - packaged `linear parallelization` helper validates decisions and reason codes
  - provider-worker proof hydration reconstructs the latest decision from audit
  - provider-worker turn end fails closed on missing decision
  - provider-worker turn end fails closed on `parallelize_now` without a child lane
  - debug snapshot exposes explicit serial/no-go reason when `child_lanes` is empty
- Required repo floor:
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd npm run build`
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd npm run test`
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd npm run pack:smoke`
- Replay proof:
  - capture one ordinary-worker replay proving `parallelize_now` plus recorded child lane(s)
  - capture one ordinary-worker replay proving `stay_serial` or `forbid_parallel` with explicit reason and `child_lanes: []`

## Open Questions

- Resolved in planning: this lane does not attempt to replace worker judgment with a fully automatic runner-side heuristic. The machine-checkable contract is the explicit recorded decision plus fail-closed enforcement and ordinary replay evidence.
