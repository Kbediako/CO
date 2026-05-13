# Task Checklist - linear-d3f1af87-57da-46ab-901d-75a6cc60420e

- Linear Issue: `CO-143` / `d3f1af87-57da-46ab-901d-75a6cc60420e`
- MCP Task ID: `linear-d3f1af87-57da-46ab-901d-75a6cc60420e`
- Primary PRD: `docs/PRD-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`
- Task spec: `tasks/specs/linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the saved workpad source were drafted or refreshed for `CO-143`. Evidence: `docs/PRD-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`, `docs/TECH_SPEC-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`, `docs/ACTION_PLAN-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`, `tasks/specs/linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`, `tasks/tasks-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`, `.agent/task/linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/workpad.md`.
- [x] Pre-implementation issue-quality review notes were captured in the task spec before coding. Evidence: `tasks/specs/linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`.
- [x] Docs-review delegation evidence is captured, or a truthful manual fallback is recorded if the wrapper stops only on the existing repo baseline. Evidence: `.runs/linear-d3f1af87-57da-46ab-901d-75a6cc60420e-co-143-docs-review/cli/2026-04-10T05-36-42-912Z-892a14b6/manifest.json`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T053642Z-docs-review-fallback.md`.

## Workflow
- [x] Issue moved from `Ready` to the live started state before active coding, or the exact blocker is recorded truthfully. Evidence: the initial live read showed `Ready`, then the packaged `linear transition --state "In Progress"` succeeded before active coding. Later issue-context and workpad writes hit the shared-budget cooldown through `2026-04-10T06:26:33.696Z`.
- [ ] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: pending shared-budget cooldown retry.
- [x] Exactly one explicit same-turn parallelization decision was recorded for the active turn. Evidence: packaged `linear parallelization --decision stay_serial --reason single_bounded_change` succeeded on `2026-04-10`.
- [x] Workspace moved from detached `HEAD` onto a task branch based on the current mainline commit. Evidence: `linear/co-143-docs-freshness-baseline`.

## Investigation
- [x] The current `docs:freshness` failure was reproduced on the current mainline workspace with saved artifacts. Evidence: `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T052635Z-baseline-docs-freshness.log`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T052635Z-baseline-docs-freshness-report.json`.
- [x] The stale set was classified by drift source rather than just aggregate count. Evidence: `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T0545Z-cohort-audit.md`, `tasks/specs/linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`.
- [x] CO-63 green-baseline evidence was inspected to confirm this is current-main drift rather than a stale closeout assumption. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/docs-freshness.json`, `tasks/index.json`.

## Implementation
- [x] The March 10 packet cohort (`1093` through `1109`) was re-reviewed and refreshed consistently across its active packet surfaces. Evidence: `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T0545Z-cohort-audit.md`, `docs/docs-freshness-registry.json`, `tasks/index.json`, `tasks/specs/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md`, `tasks/specs/1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation.md`.
- [x] The lane remains explicitly separate from the CO-134 test/review-wrapper seam. Evidence: `docs/PRD-linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`, `tasks/specs/linear-d3f1af87-57da-46ab-901d-75a6cc60420e.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-d3f1af87-57da-46ab-901d-75a6cc60420e node "/Users/kbediako/Code/CO/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-143-docs-review --format json`. Evidence: `.runs/linear-d3f1af87-57da-46ab-901d-75a6cc60420e-co-143-docs-review/cli/2026-04-10T05-36-42-912Z-892a14b6/manifest.json`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T053642Z-docs-review-fallback.md`.
- [x] `npm run docs:freshness`. Evidence: `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T055613Z-post-fix-docs-freshness.log`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T055613Z-post-fix-docs-freshness-report.json`.
- [x] Repo validation floor is run because the final diff is expected to be non-trivial. Evidence: `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T060258Z-validation-summary.md`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T060258Z-delegation-guard-rerun.log`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T060149Z-spec-guard-rerun.log`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T060258Z-build-rerun.log`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T060258Z-lint-rerun.log`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T060258Z-test-rerun.log`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T060149Z-docs-check-rerun.log`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T060149Z-docs-freshness-rerun.log`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T060149Z-diff-budget-rerun.log`.
- [x] Downstream proof confirms the repaired tree no longer stops first at `docs:freshness`. Evidence: `.runs/linear-d3f1af87-57da-46ab-901d-75a6cc60420e-co-143-implementation-gate/cli/2026-04-10T05-38-50-948Z-1bdceb5b/manifest.json`.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review handoff. Evidence: pending.
- [x] Standalone review and elegance review are captured before review handoff if the final diff remains non-trivial. Evidence: `.runs/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/cli/2026-04-10T05-25-30-334Z-e3a8ad97/review/telemetry.json`, `.runs/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/cli/2026-04-10T05-25-30-334Z-e3a8ad97/review/output.log`, `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T060258Z-elegance-review.md`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition, PR checks are green, and `pr ready-review` drains cleanly. Evidence: pending.
