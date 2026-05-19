---
id: 20260414-linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2
title: CO workflow: make parent-owned same-issue child lanes parallel-first by default where safe
status: done
owner: Codex
created: 2026-04-14
last_review: 2026-05-16
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2.md
related_action_plan: docs/ACTION_PLAN-linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2.md
related_tasks:
  - tasks/tasks-linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2.md
review_notes:
  - 2026-04-14: Live issue context confirmed the workflow states, moved `Ready` -> `In Progress`, created branch `linear/co-174-parallel-first-child-lanes`, and created Linear workpad comment `027d42cb-b957-49f3-a6cf-6bfafec6a91f`.
  - 2026-04-14: The matrix found safe `surface-inventory`, recorded `parallelize_now` / `independent_scope_available`, launched the child lane, then parent invalidated the completed patch as stale after issue `updated_at` changed.
  - 2026-04-14: Issue-quality review approved this as a policy/adoption layer over `CO-35`, `CO-101`, and `CO-125`; audited docs-review succeeded with telemetry `clean-success`.
  - 2026-05-16: CO-545 strict spec-guard audit reclassified this stale Apr 14/15 row as inactive done; live `node bin/codex-orchestrator.js linear issue-context --issue-id 3cdd7af3-787e-4e73-bb00-731feb5d0db2 --format json` verified CO-174 is Linear Done/completed and attached/related PR evidence https://github.com/Kbediako/CO/pull/470. No completed_at was inferred or fabricated.
---

# Technical Specification

## Context

`CO-35` shipped the parent-owned same-issue child-lane runtime and explicit parent accept/reject/invalidate flow. `CO-101` made ordinary provider-worker parallelization decisions machine-checkable and fail-closed for `parallelize_now` without a child lane. `CO-125` set provider max-concurrency and admission constraints.

`CO-174` sits above those slices. The current runtime works, but adoption remains mostly serial: `5` `parallelize_now` decisions out of `235` recorded decisions. This lane makes safe parallel-first posture the ordinary default by requiring a pre-turn decomposition matrix, tightening serial evidence, defining cap semantics, preserving parent ownership discipline, and adding shaped canary reporting.

## Requirements

1. Require a pre-turn decomposition matrix with candidate child lanes, file/phase scope, dependencies, overlap risk, expected validation artifact, owner, and cap-slot use.
2. Reject `stay_serial` while any safe independent candidate exists; `single_bounded_change` must explain why no docs/test/research/review slice separates safely.
3. Count active, pending, and unaccepted child lanes against a safe cap; report cap exhaustion explicitly and preserve `CO-125`, while excluding recoverable stale in-flight accept claims older than 30 minutes, or legacy in-flight claims without timestamps, from cap occupancy.
4. Make parent ownership explicit: no parent edits to active delegated files/phases except to invalidate/reject or resolve a collision before acceptance.
5. Expose the policy in packaged help/agent docs and prove it with a shaped canary that beats `5/235`, records accepted/rejected/invalidated lane outcomes with reasons, and launches zero metric-only lanes.
6. Keep `CO-35`, `CO-101`, and `CO-125` behavior valid.

## Issue-Shaping Contract
- User-request translation carried forward: make parent-owned same-issue child-lane parallelization the safe ordinary default while preserving parent authority and bounded child work.
- Protected terms / exact artifact and surface names: `linear parallelization --decision parallelize_now|stay_serial|forbid_parallel`, `linear child-lane --action launch|accept|reject|invalidate`, `parallelize_now`, `stay_serial`, `forbid_parallel`, `independent_scope_available`, parent-owned same-issue child-lane parallelization, pre-turn decomposition matrix, child-lane cap, parent ownership discipline, shaped canary.
- Nearby wrong interpretations to reject: runtime rebuild, unconditional child-lane forcing, metric-hack child lanes, weakened parent-only Linear mutation, parent edits to active delegated scope followed by unqualified child acceptance.
- Explicit non-goals carried forward: no active issue transitions for the canary, no global provider-concurrency increase, no generic scheduler-wide multi-worker orchestration.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth |
| --- | --- | --- | --- |
| Decision posture | One decision per turn exists, but ordinary adoption is serial-heavy. | User wants child lanes as the main/default safe mode. | Eligible turns look for safe child lanes before serializing. |
| Serial evidence | `stay_serial` can be broad. | Serial mode should be exceptional and evidence-backed. | The matrix must prove no safe independent candidate before `stay_serial`. |
| Cap accounting | Child-lane launch and acceptance exist. | `CO-125` admission constraints remain binding. | Active, pending, and unaccepted child lanes count against a safe cap; cap exhaustion is explicit; stale in-flight accept claims older than 30 minutes and legacy in-flight claims without timestamps are recoverable without occupying cap. |
| Parent ownership | Parent acceptance exists. | Child lanes own bounded slices. | Parent avoids active delegated files/phases and handles collisions before acceptance. |
| Adoption proof | Baseline is `5/235` `parallelize_now`. | Adoption should increase where safe. | Shaped canary proves a higher safe rate and zero metric-only lanes. |

## Readiness Gate
- Not done if: a worker can still select `stay_serial` while a safe independent matrix candidate exists; cap exhaustion is silent; child-lane outcomes are counted without accept/reject/invalidate reasons; parent ownership discipline is only implied.
- Pre-implementation issue-quality review evidence: approved on 2026-04-14 after live issue-context and workpad bootstrap. The issue is not narrower than the user request because it includes policy, cap semantics, parent discipline, discoverability, canary proof, and compatibility coverage.
- Safeguard ownership split: parent owns docs-first packet, Linear mutation, implementation integration, and final acceptance. Child lane `surface-inventory` owns bounded code/test surface inventory under declared files/phases until the parent accepts, rejects, or invalidates the result.

## Technical Requirements
- Functional: extend provider-worker guidance with matrix-first policy, stricter serial threshold, cap exhaustion, parent restraint, preserved reason-pair vocabulary, and shaped canary reporting.
- Non-functional: deterministic local canary artifacts, no live canary issue transitions, no global concurrency bypass, and compatibility with existing child-lane proof/debug surfaces.
- Interfaces: `buildParallelizationGuidance(...)`, packaged `linear` help, child-lane ledger decisions, and canary output under `out/<task-id>/`.

## Architecture & Data
- Keep policy in provider-worker guidance/docs, reuse ledger/proof data, and avoid persistent schema migration; canary output is local report data only.
- Linear helper commands remain parent-only for issue mutation, and cap semantics must align with `CO-125` admission constraints.

## Validation Plan
- Tests/checks: focused provider-worker, child-lane, help, and canary tests plus the required validation floor before handoff.
- Rollout verification: save shaped canary output under `out/linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2/` and record child-lane parent decisions in the workpad.
- Monitoring: future audits compare `parallelize_now` counts against `5/235` while checking metric-only-lane guard status.

## Open Questions
- None blocking. The cap value should be conservative and may be implemented as a default constant or prompt-level cap if existing runtime cap state is already authoritative enough.

## Approvals
- Reviewer: docs-review child stream
- Date: 2026-04-14
- Evidence: `.runs/linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2-co-174-docs-review/cli/2026-04-13T23-05-04-374Z-17c6fed0/manifest.json` (`clean-success`)
