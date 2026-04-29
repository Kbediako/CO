---
id: 20260430-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9
title: "CO-408 durable child-lane decision lineage"
relates_to: docs/PRD-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md
risk: high
owners:
  - Codex
last_review: 2026-04-30
---

# TECH_SPEC - CO-408 durable child-lane decision lineage

This mirror points to the canonical task spec at `tasks/specs/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.

## Implementation Summary
- Create durable lineage that ties each recovered same-issue child lane to the parent turn and `parallelize_now` decision it satisfies.
- Update provider-worker retry recovery to prefer lineage over timestamp inference.
- Preserve CO-403's fail-closed behavior for stale older child lanes, missing launches, failed children, ambiguous records, and stream-only matches.
- Permit bounded timestamp inference only for legacy records where lineage is absent and the existing narrow timestamp-skew check still proves the recovery is explicitly safe.
- Surface accepted/rejected lineage truth in `provider-linear-worker-proof.json` and `co-status` for reviewer diagnosis.
- Packet note: this PR only creates traceability packet/mirrors; CO-408 implementation remains Backlog/Ready-gated until this packet lands.

## Protected Surfaces
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
- `orchestrator/src/cli/providerLinearChildStreamShell.ts`
- `orchestrator/src/cli/coStatusCliShell.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts`
- `provider-linear-worker-proof.json`
- `provider-worker retry recovery`
- `same-issue child lane`
- `parallelize_now`
- `recover_child_lane:<stream>`
- `recover_run:<run_id>`
- `latest prior decision lineage`
- `stale older child lane`
- `fail closed`
- `pending parent acceptance`

## Target Lineage Contract

| Contract Element | Requirement | Notes |
| --- | --- | --- |
| Parent turn lineage | Every lineage-capable recovered child-lane record identifies the parent turn that requested the child lane. | The stable identifier must survive retries/resumes without depending on wall-clock ordering. |
| Decision lineage | The record identifies the specific `parallelize_now` decision the child lane satisfies. | A durable decision id or equivalent audit linkage is acceptable. |
| Child identity | The record preserves issue id, child stream, child run id, launch time, completion state, and pending parent acceptance state. | Stream alone is never enough. |
| Recovery markers | `recover_child_lane:<stream>` and `recover_run:<run_id>` remain diagnostics and must be tied to lineage before satisfying enforcement. | Markers cannot replace decision lineage. |
| Legacy fallback | Missing lineage may use timestamp inference only when legacy records predate lineage support and the narrow timestamp-skew window remains explicitly safe. | No broad timestamp-tolerance increase. |
| Proof/status | Proof and status expose accepted lineage, safe legacy fallback, or fail-closed rejection reason. | Reviewer diagnosis must not require reconstructing wall-clock order manually. |

## Technical Requirements
1. Add first-class lineage or equivalent companion audit proof linking same-issue child-lane records to parent turn and parallelization decision lineage.
2. Keep `parallelize_now` enforcement fail-closed when lineage is missing, ambiguous, stale, older than the latest prior decision, or only stream-matched.
3. Let retry recovery accept a child lane launched before the decision audit row only when durable lineage proves it satisfies that decision.
4. Retain bounded timestamp inference only for legacy records where lineage is absent and explicitly safe under the existing narrow skew policy.
5. Preserve pending parent acceptance checks before a recovered child lane satisfies enforcement.
6. Expose lineage truth through `provider-linear-worker-proof.json` and `co-status`.
7. Add focused positive and negative tests for launch-before-decision recovery, stale older child-lane rejection, stream-only match rejection, and legacy fallback classification.

## Parity / Alignment Matrix
- Current truth:
  - CO-403 intentionally keeps retry recovery fail-closed when a child-lane launch predates the latest ordinary `parallelize_now` audit row beyond a narrow timestamp-skew window.
  - `recover_child_lane:<stream>` and `recover_run:<run_id>` help diagnose recovery but do not by themselves prove decision lineage.
- Reference truth:
  - same-issue child-lane enforcement must not count stale older child lanes or any successful child lane by stream alone.
  - future launch-before-decision ordering needs durable proof instead of broader timestamp tolerance.
- Target truth:
  - recovery accepts launch-before-decision ordering only when the child record or companion audit entry carries latest prior decision lineage.
  - legacy timestamp fallback stays bounded and visible.
  - proof/status explain whether recovery used durable lineage, safe legacy timestamp inference, or fail-closed rejection.
- Explicitly out-of-scope differences:
  - changing CO-403 behavior in this packet lane
  - relaunching duplicate child lanes to paper over missing lineage
  - unrelated provider current-state authority
  - PR review handoff behavior
  - Linear state or provider WIP-slot mutation

## Validation Contract
- Packet lane:
  - `git diff --check`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - scoped diff/status review for packet-only changes
- Parent lane:
  - provider-worker retry recovery tests for durable launch-before-decision lineage
  - negative tests for stale older unrelated child lanes, stream-only matches, missing lineage, and unsafe timestamp inference
  - proof/status tests for lineage and fail-closed diagnostics
  - normal review/elegance/PR/Linear handoff gates after implementation

## Not Done If
- A stale older child lane can satisfy a newer `parallelize_now` decision.
- Any successful child lane is counted by stream alone.
- Timestamp tolerance is widened without durable lineage.
- Pending parent acceptance checks are weakened.
- `recover_child_lane:<stream>` or `recover_run:<run_id>` is treated as sufficient proof without latest prior decision lineage.
- `co-status` or proof surfaces hide lineage/fallback/rejection truth.
- This packet PR includes provider-worker implementation edits.
