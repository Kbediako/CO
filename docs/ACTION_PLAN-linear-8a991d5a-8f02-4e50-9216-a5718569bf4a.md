# ACTION_PLAN - CO appserver child-lane stale invalidation must prove runner identity before candidate emission

## Summary
- Goal: give the parent lane a bounded implementation plan for `CO-371`, where `providerLinearChildLaneRunner` process identity must be proven before appserver child-lane stale invalidation emits `stale_invalidation_candidate`.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned runner-identity implementation, and parent-owned focused validation.
- Assumptions:
  - the shared source payload itself is absent in this child checkout
  - the bounded handoff wording is authoritative for the issue checksum
  - `heartbeat stale` and `no proof output` are symptoms, not sufficient stale-invalidation proof
  - ambiguous or unknown process identity remains fail-closed and must not produce a stale invalidation candidate

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `providerLinearChildLaneRunner`
  - `runner_alive`
  - `provider_linear_child_lane_runner_pid`
  - `provider_linear_child_lane_runner_started_at`
  - `runtime_mode=appserver`
  - `stale_invalidation_candidate`
  - PID reuse
  - `heartbeat stale`
  - `no proof output`
- Not done if:
  - `stale_invalidation_candidate` can still be emitted without proven runner identity
  - PID reuse can be treated as dead original-runner evidence
  - missing or unreadable `provider_linear_child_lane_runner_started_at` can still produce a candidate
  - unknown `runner_alive` can be treated as `runner_alive=false`
  - `heartbeat stale` plus `no proof output` is sufficient without process identity
- Pre-implementation issue-quality review:
  - 2026-04-25: the bounded handoff wording makes this a runner identity and fail-closed stale-invalidation lane, not a generic appserver startup or scheduler lane. The packet preserves the exact checksum and rejects heartbeat-only, proof-output-only, and PID-only interpretations.

## Milestones & Sequencing
1. Create the docs-first packet and mirrors for `CO-371` within the declared docs scope.
2. Parent audits `providerLinearChildLaneRunner`, `providerLinearChildLaneShell`, and existing provider child-lane tests for the current stale-candidate seam.
3. Parent identifies where to persist `provider_linear_child_lane_runner_pid` and `provider_linear_child_lane_runner_started_at` for `runtime_mode=appserver` child lanes.
4. Parent implements a single stale-candidate eligibility predicate requiring exact runner identity, `runner_alive=false`, `heartbeat stale`, and `no proof output`.
5. Parent ensures PID reuse, missing start identity, unreadable process state, or unknown `runner_alive` fails closed with no `stale_invalidation_candidate`.
6. Parent adds focused regressions for dead same-runner, live same-runner, PID reuse, missing identity, heartbeat stale, and no proof output.
7. Parent reruns focused validation, default repo gates, docs-review, and normal PR lifecycle.

## Dependencies
- Shared source anchor: `ctx:sha256:66a6cc3b9ceee1998def43ba374bd15a5cb4586ea54de754de30f8c48dbfe7ba#chunk:c000001`
- Origin manifest: `.runs/linear-8a991d5a-8f02-4e50-9216-a5718569bf4a-docs-packet/cli/2026-04-25T13-29-35-913Z-88cc9756/manifest.json`
- Likely parent implementation seams:
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts`
  - `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`

## Validation
- Child lane only:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `rg -n "providerLinearChildLaneRunner|runner_alive|provider_linear_child_lane_runner_pid|provider_linear_child_lane_runner_started_at|runtime_mode=appserver|stale_invalidation_candidate|PID reuse|heartbeat stale|no proof output" docs/PRD-linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md docs/TECH_SPEC-linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md docs/ACTION_PLAN-linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md tasks/specs/linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md tasks/tasks-linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md .agent/task/linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md`
  - `git diff --check -- docs/PRD-linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md docs/TECH_SPEC-linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md docs/ACTION_PLAN-linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md tasks/specs/linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md tasks/tasks-linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md .agent/task/linear-8a991d5a-8f02-4e50-9216-a5718569bf4a.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent implementation lane:
  - focused `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts`
  - focused `orchestrator/tests/ProviderLinearChildLaneShell.test.ts` if parent decision output is touched
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review` or `npm run review`
  - `npm run pack:smoke` when parent source changes touch downstream CLI/package behavior
- Rollback plan:
  - revert the stale-candidate predicate or runner-identity field plumbing if it weakens fail-closed behavior or emits candidates for ambiguous identity

## Risks & Mitigations
- Risk: a PID-only check misclassifies PID reuse as dead original-runner evidence.
  - Mitigation: require `provider_linear_child_lane_runner_started_at` and treat mismatch as unknown/no candidate.
- Risk: unknown process identity gets coerced into `runner_alive=false`.
  - Mitigation: model unknown separately and fail closed without `stale_invalidation_candidate`.
- Risk: no-proof behavior gets confused with proof acceptance.
  - Mitigation: keep `no proof output` as an explicit symptom and never fabricate proof or auto-accept patches.
- Risk: the implementation broadens into appserver runtime or scheduler redesign.
  - Mitigation: keep the scope local to `providerLinearChildLaneRunner` stale candidate eligibility and parent-visible decision output.

## Approvals
- Docs packet child lane: `.runs/linear-8a991d5a-8f02-4e50-9216-a5718569bf4a-docs-packet/cli/2026-04-25T13-29-35-913Z-88cc9756/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation/review/PR lifecycle: pending parent lane
