# Task Checklist - linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c

- Linear Issue: `CO-211` / `59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c`
- MCP Task ID: `linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c`
- Primary PRD: `docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- Task spec: `tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- Source anchor: `ctx:sha256:d4239a4784c1cf71c95ab480b4a3821dc2c83dc3648d3b8d4a8c5387ccdfb3f8#chunk:c000001`
- Apr 18 recurrence source anchor: `ctx:sha256:6a9427aa000f73b2f7d86bab415ae29c6ebbeb9172e159c03bc6d29ae012ff52#chunk:c000001`

## Docs-First
- [x] PRD drafted for repeated refresh-stuck restart churn while active provider workers remain healthy. Evidence: `docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, protected terms, readiness gate, and parent-owned validation requirements. Evidence: `docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`, `tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`.
- [x] ACTION_PLAN drafted for parent implementation and closeout. Evidence: `docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`.
- [x] Task checklist and `.agent` mirror drafted within child-lane scope. Evidence: `tasks/tasks-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`, `.agent/task/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`.
- [x] Registry and snapshot mirrors updated within this docs lane. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Pre-implementation issue-quality review recorded in the TECH_SPEC readiness gate. Evidence: `docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`, `tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`.

## Source / Assumptions
- [x] Shared source-0 metadata anchor recorded. Evidence: `ctx:sha256:737c3cf3d517b1a44673a4ef90593a10f7303f6e022a667e75cceca113e8acb8#chunk:c000001`.
- [x] Child lane verified the shared source-0 payload is metadata/provenance only, not the issue body. Evidence: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-packet/cli/2026-04-17T02-07-55-950Z-cb83673c/memory/source-0/source.txt`.
- [x] Child lane read the current issue body through the packaged read-only issue-context helper without Linear mutation. Evidence: `node /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js linear issue-context --issue-id 59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c --format json`.
- [x] Apr 18 recurrence source-0 payload verified as metadata/provenance only. Evidence: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr18-refresh/cli/2026-04-18T18-35-19-649Z-1ede381a/memory/source-0/source.txt`.
- [x] PR #506 merge evidence recorded from local git history. Evidence: `e98d459f4dfdb47a22d981fedbf5ba11053d3a95` (`fix(control-host): quarantine repeated refresh-stuck restart churn`).
- [x] Parent-owned recurrence source boundary recorded: quarantined samples must preserve fail-closed unhealthy streaks and diagnostic retention. Evidence: PRD, TECH_SPEC, ACTION_PLAN, and this checklist.
- [x] Parent/child ownership split recorded. Evidence: this checklist, the PRD, and the TECH_SPEC readiness gate.

## Parent Implementation Acceptance
- [ ] Reproduce or simulate the Apr 17 churn shape where active `CO-207` / `CO-210`-like provider workers remain running while control-host polling enters `provider_refresh_lifecycle_stuck` / `restart_required`. Evidence: pending parent focused artifact.
- [ ] Persist machine-checkable restart/churn evidence covering restart series, `owner rotations`, `refresh phases`, and `surviving provider workers`. Evidence: pending parent artifact path.
- [ ] Diagnostics identify the stuck refresh phase, request or claim class, operation age, queued/checking state, and current provider keys around `stalled_after_ms=45000`. Evidence: pending parent artifact or focused tests.
- [ ] Fix or quarantine the root re-entry condition so healthy active workers do not trigger repeated supervisor restarts within normal polling cadence. Evidence: pending parent source diff and focused regression coverage.
- [ ] Quarantined samples preserve fail-closed unhealthy streaks and diagnostic retention after PR #506. Evidence: pending parent source diff and focused recurrence coverage.
- [ ] Genuine stuck refreshes still surface `provider_refresh_lifecycle_stuck` and `restart_required=true`. Evidence: pending parent focused regression.
- [ ] Recovery preserves active `provider-linear-worker` processes and request-budget/no-request-burn safeguards. Evidence: pending parent focused regression and artifact-backed proof.
- [ ] `co-status --format json` succeeds after recovery with `polling.stuck=false`, `polling.restart_required=false`, and live provider workers visible. Evidence: pending parent post-recovery status artifact.
- [ ] Focused regression coverage includes repeated restart churn and a no-regression path for `CO-194` stale terminal claims. Evidence: pending parent focused test run.

## Validation
- [x] Docs child lane scoped JSON syntax check. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json` exits `0`.
- [x] Docs child lane scoped whitespace check. Evidence: `git diff --check -- docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/tasks-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md .agent/task/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json` exits `0`.
- [ ] Parent focused repeated-churn regression coverage. Evidence: pending parent test run.
- [ ] Parent focused quarantined-sample recurrence coverage. Evidence: pending parent test run.
- [ ] Parent focused `CO-194` no-regression coverage. Evidence: pending parent test run.
- [ ] Parent docs-review evidence captured before implementation. Evidence: pending parent manifest.
- [ ] Parent post-recovery `co-status --format json` proof captured. Evidence: pending parent artifact.

## Handoff Status
- [x] Child lane leaves packet and registry/checklist changes in place for patch export. Evidence: dirty working tree in this child workspace.
- [ ] Parent accepts the patch artifact and proceeds with implementation. Evidence: pending parent decision.
- [ ] Parent updates Linear workpad and PR lifecycle artifacts. Evidence: pending parent lane.

## Progress Log
- 2026-04-17: Created the scoped docs-first packet from the current `CO-211` issue body via read-only `linear issue-context`, with the shared source-0 metadata-only caveat recorded in the packet.
- 2026-04-17: Preserved the exact protected terms and the explicit `Not Done If` contract, including `CO-210` child-lane manifest hydration semantics staying out of scope.
- 2026-04-17: Completed the requested scoped checks: `jq empty` and `git diff --check`.
- 2026-04-18: Refreshed the packet for Apr 18 recurrence evidence after merged PR #506, recorded that the new source-0 payload is metadata/provenance only, and kept the parent source fix for quarantined samples preserving fail-closed unhealthy streaks and diagnostic retention out of child-lane scope.

## Relevant Files
- `docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `tasks/tasks-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `.agent/task/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Notes
- Do not change `CO-210` child-lane manifest hydration semantics in this lane.
- Do not collapse the issue into attach-only recovery or status-only projection.
- Do not hide `provider_refresh_lifecycle_stuck` / `restart_required` truth.
- Do not kill or restart healthy active provider workers as the recovery mechanism.
- Do not clear fail-closed unhealthy streaks or drop diagnostic retention from quarantined samples.
