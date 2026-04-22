# ACTION_PLAN - CO-299 local Node OOM backpressure and provenance-safe child-lane progress truth

## Summary
- Goal: give the parent lane a bounded implementation plan for CO-299 host-safety backpressure and provenance-safe progress truth.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned local Node OOM/resource pressure classification, parent-owned provider-worker backpressure, and parent-owned provenance-invalid retry/progress accounting.
- Assumptions:
  - the parent-provided source anchor and issue framing are authoritative for this packet
  - the first docs-reset child lane was invalidated for host-safety recovery; the parent imported only the docs patch shape and completed a zero-byte docs-shape advisory child lane
  - parent owns all source/test/package edits and all Linear/GitHub lifecycle work
  - fail-closed provenance remains mandatory

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `local Node OOM`
  - `concurrent provider-worker pressure`
  - `provenance-invalid child-lane retry/progress churn`
  - `host-safety backpressure/observability`
  - `fail-closed provenance`
  - `provider-worker`
  - `provider-linear-worker`
  - `linear child-lane`
  - `linear child-stream`
  - `provider_worker_child_lane_provenance_invalid`
  - `provider_worker_child_stream_provenance_invalid`
  - `manifest.json`
  - `provider-linear-worker-proof.json`
  - `provider-intake-state.json`
  - `co-status --format json`
  - `CO STATUS`
  - `max_concurrent_agents`
- Not done if:
  - local Node OOM/resource pressure does not activate observable host-safety backpressure
  - provenance-invalid child-lane or child-stream failures count as issue progress
  - provenance checks are weakened or bypassed
  - the fix is only a cap increase, log cleanup, or display-only change
- Pre-implementation issue-quality review:
  - 2026-04-22: the issue is not plausibly narrower than a log wording change because it requires backpressure behavior, and not broader than local provider-worker host safety because it explicitly excludes cloud/scheduler redesign and provenance bypass.

## Milestones & Sequencing
1. Create the CO-299 docs-first packet and declared mirrors on the fresh Rework branch.
2. Parent audits provider-worker launch/admission for local resource pressure and concurrency behavior.
3. Parent identifies canonical local Node OOM/resource pressure signals from proof, manifest, stderr, exit code, or process signal evidence.
4. Parent implements the smallest host-safety backpressure seam that prevents additional local provider-worker pressure while preserving normal valid launches.
5. Parent audits child-lane and child-stream retry/progress accounting for provenance-invalid outcomes.
6. Parent implements no-progress truth for `provider_worker_child_lane_provenance_invalid` and `provider_worker_child_stream_provenance_invalid` while preserving fail-closed behavior.
7. Parent projects host-safety and provenance reasons into proof/status/read-model output.
8. Parent runs focused regressions and parent-selected validation/review before PR handoff.

## Dependencies
- Shared source anchor: `ctx:sha256:0320d3a6b57e0f8847509632a1b1cf89ffd868f1412cbb569e67ac7eb380f394#chunk:c000001`
- Successful child-lane advisory manifest: `.runs/linear-59a75110-93e5-42f4-a2d2-31dcde884c91-docs-shape-advisory/cli/2026-04-22T06-47-18-744Z-28f2a3fb/manifest.json`
- Parent-owned surfaces:
  - provider-worker launch/admission and proof generation
  - `linear child-lane` and `linear child-stream` provenance validation and retry accounting
  - `manifest.json`
  - `provider-linear-worker-proof.json`
  - `provider-intake-state.json`
  - `co-status --format json`
  - `CO STATUS`

## Validation
- Docs packet:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json', 'utf8')); JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json', 'utf8')); console.log('json ok')"`
  - `rg -n "local Node OOM|concurrent provider-worker pressure|provenance-invalid child-lane retry/progress churn|host-safety backpressure/observability|fail-closed provenance|provider_worker_child_lane_provenance_invalid|provider_worker_child_stream_provenance_invalid" docs/PRD-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md docs/TECH_SPEC-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md docs/ACTION_PLAN-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md tasks/specs/linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md tasks/tasks-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md .agent/task/linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md`
  - `git diff --check -- docs/PRD-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md docs/TECH_SPEC-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md docs/ACTION_PLAN-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md tasks/specs/linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md tasks/tasks-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md .agent/task/linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent implementation lane:
  - focused regression for local Node OOM/resource-pressure classification
  - focused regression for launch/admission backpressure under pressure
  - focused regression for provenance-invalid child-lane/child-stream no-progress truth
  - valid-provenance regression proving child-lane/child-stream behavior still works
- Rollback plan:
  - revert parent source changes if they weaken provenance validation, increase concurrency instead of backpressuring, hide diagnostics, or overstate progress.

## Risks & Mitigations
- Risk: parent reduces noise by bypassing provenance checks.
  - Mitigation: preserve fail-closed provenance as a Not Done If and validation target.
- Risk: parent fixes OOM by increasing local concurrency or continuing to launch under pressure.
  - Mitigation: require host-safety backpressure and keep `max_concurrent_agents` unchanged.
- Risk: parent fixes only terminal text.
  - Mitigation: require launch/admission backpressure plus machine-checkable evidence.
- Risk: retry/progress churn persists after provenance-invalid attempts.
  - Mitigation: require a regression separating failed launch attempts from real issue progress.

## Approvals
- Docs packet: pending parent acceptance
- Parent docs-review: pending parent lane
- Parent implementation/review/PR lifecycle: pending parent lane
