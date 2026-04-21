# Task Checklist - linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749

- Linear Issue: `CO-294` / `8bbdd424-d77e-4312-b4b7-2a82c3df2749`
- MCP Task ID: `linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749`
- Primary PRD: `docs/PRD-linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`
- TECH_SPEC: `tasks/specs/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`
- Source anchor: `ctx:sha256:53c5ae82c95c7c73e6381099a5276bd98b502514ed8012869a1b100347fb0691#chunk:c000001`
- Origin manifest: `.runs/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749/cli/2026-04-21T16-10-47-501Z-6477672f/manifest.json`
- Initial workpad comment: `56df7b85-9444-4183-9764-df012d484962`

## Docs-First
- [x] PRD drafted for released-claim run metadata, operator advisory, and advisory-state truth reconciliation. Evidence: `docs/PRD-linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, non-goals, and validation plan. Evidence: `tasks/specs/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`, `docs/TECH_SPEC-linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`.
- [x] ACTION_PLAN drafted for source mapping, focused regressions, implementation, validation, review, and handoff. Evidence: `docs/ACTION_PLAN-linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`.
- [x] Checklist mirrored to `.agent/task/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`. Evidence: `.agent/task/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`.
- [x] Docs-review evidence captured before source implementation. Evidence: `.runs/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749/cli/2026-04-21T16-18-01-364Z-26084c74/manifest.json`.

## Implementation Acceptance
- [ ] Released/non-active claims no longer surface `run_manifest_path` / run-state metadata that contradict live issue state or terminal run outcome. Evidence: pending focused regression and implementation.
- [ ] Terminal issues do not retain pointers to `in_progress` manifests in operator-facing intake/state surfaces. Evidence: pending focused regression and implementation.
- [ ] Operator autopilot unblock recommendations are suppressed or corrected when blocker truth is stale or contradicted by fresher issue/PR state. Evidence: pending focused regression and implementation.
- [ ] `linear-advisory-state.json` is refreshed truthfully from live source or explicitly marked deprecated/stale. Evidence: pending focused regression and implementation.
- [ ] Active-lane admission/attach behavior remains preserved. Evidence: pending adjacent coverage.

## Validation
- [x] Linear issue context inspected and state moved from `Ready` to `In Progress`. Evidence: `linear issue-context`, `linear transition`.
- [x] Attached PR #571 swept before implementation; it is a closed stale `CO-272` draft with no actionable CO-294 feedback. Evidence: `gh pr view 571`, PR comments/reviews API.
- [x] Same-turn parallelization decision recorded as `stay_serial/single_bounded_change` due to dirty shared root and no safe independent child lane before worktree isolation. Evidence: `linear parallelization`.
- [x] Docs-review before implementation. Evidence: `.runs/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749/cli/2026-04-21T16-18-01-364Z-26084c74/manifest.json`; `docs:freshness:maintain` clean with `blocking_changed_paths=[]`.
- [ ] Focused post-release run-pointer regression. Evidence: pending.
- [ ] Focused stale `ready_to_unblock` regression. Evidence: pending.
- [ ] Focused advisory-state freshness/deprecation regression. Evidence: pending.
- [ ] Required repo validation gates. Evidence: pending.
- [ ] Standalone review and elegance pass. Evidence: pending.
- [ ] PR attached and `pr ready-review` drain clean before `In Review`. Evidence: pending.

## Progress Log
- 2026-04-22: Parent created isolated worktree `.workspaces/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749` from `origin/main` because the shared root was dirty on `linear/co-278-refresh-spec-guard-baseline`.
- 2026-04-22: Parent docs-first packet created for the full `CO-294` post-release truth surface, preserving exact issue wording and rejecting display-only cleanup or active-lane weakening.
- 2026-04-22: Child-stream docs-review failed closed with `provider_worker_child_stream_provenance_invalid`; parent ran manifest-backed docs-review with a scoped delegation-guard override for that provenance blocker. The first fallback exposed a missing `.agent/task` registry row, parent fixed it, and the rerun succeeded.
