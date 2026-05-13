# Task Checklist - linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6

- Linear Issue: `CO-128` / `1cd22f2a-5a12-4d2f-bc32-8289f4d24be6`
- MCP Task ID: `linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6`
- Primary PRD: `docs/PRD-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`
- Task spec: `tasks/specs/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` were recreated for the fresh CO-128 rework branch.
- [x] Pre-implementation issue-quality review notes were captured in the task spec before coding.
- [x] Audited docs-review delegation evidence is recorded for the final refreshed packet on the fresh rework branch. Evidence: `.runs/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6-co-128-docs-review-rework-rerun/cli/2026-04-10T15-48-35-359Z-ace09c6b/manifest.json`, `.runs/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6-co-128-docs-review-rework-rerun/cli/2026-04-10T15-48-35-359Z-ace09c6b/review/telemetry.json`.

## Workflow
- [x] The issue is already in an active started state (`Rework`) and the stale PR/workpad reset was completed before new implementation work.
- [x] Exactly one same-turn parallelization decision was recorded as `stay_serial` / `review_or_validation_only`.
- [x] The single Linear workpad comment has been recreated and refreshed for the new rework attempt.
- [x] The unrelated repo blocker discovered during validation was filed as follow-up `CO-150` instead of widening CO-128 scope.
- [x] A fresh PR is attached before review handoff. Evidence: PR `#432` (`https://github.com/Kbediako/CO/pull/432`).

## Investigation
- [x] Establish the real fresh-branch status of the failing seam. The original CO-128 failure does not reproduce on current `origin/main`.
- [x] Reproduce the direct `node --loader ts-node/esm bin/codex-orchestrator.ts frontend-test --format json` path with a fake `CODEX_CLI_BIN`; it emits a manifest and terminal success.
- [x] Keep the lane explicitly separate from provider refresh-path work and generic frontend cleanup.

## Implementation
- [x] No runtime bootstrap fix was reapplied because current mainline already satisfies the issue contract on the fresh branch.
- [x] Current `MCP_RUNNER_TASK_ID` entrypoint behavior remains untouched.
- [x] The `frontend-test` command path behavior and output contract remain unchanged.
- [x] No additional regression coverage was needed because the fresh tree already passes the exact protected validation surfaces.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: terminal output recorded in this lane (`Delegation guard: OK (2 subagent manifest(s) found).`).
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: terminal output recorded in this lane.
- [x] `npm run build`. Evidence: terminal output recorded in this lane.
- [x] `npm run lint`. Evidence: terminal output recorded in this lane.
- [x] `npm run test -- tests/cli-frontend-test.spec.ts`. Evidence: terminal output recorded in this lane (`4/4` passed).
- [x] Manual `node --loader ts-node/esm bin/codex-orchestrator.ts frontend-test --format json` repro with a fake `CODEX_CLI_BIN`. Evidence: `out/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/manual/20260410T153728Z-manual-repro-fresh-main.json`.
- [x] Focused adjacent smoke needed to prove the fix does not break the intended `frontend-testing` contract. Evidence: terminal output recorded in this lane (`tests/cli-command-surface.spec.ts` plus `tests/cli-frontend-test.spec.ts` passed `111/111`).
- [x] `npm run test` was executed and surfaced an unrelated current-main blocker in `orchestrator/tests/ProviderIssueHandoff.test.ts` (`continues snapshot-only Todo retries when persisted blocker metadata is still non-terminal`). Evidence: terminal output recorded in this lane; follow-up issue `CO-150`.
- [x] `npm run docs:check`. Evidence: terminal output recorded in this lane.
- [x] `npm run docs:freshness`. Evidence: terminal output recorded in this lane.
- [x] `node scripts/diff-budget.mjs`. Evidence: terminal output recorded in this lane.
- [x] `npm run pack:smoke`. Evidence: terminal output recorded in this lane.

## Closeout
- [x] Fresh standalone review was truthfully replaced with a recorded manual fallback after a classified wrapper boundary. Evidence: `.runs/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/cli/2026-04-10T10-01-23-158Z-7c7afa99/review/telemetry.json`, `out/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/manual/20260410T160139Z-review-boundary-fallback.md`.
- [x] Explicit elegance/minimality pass is completed before review handoff. Evidence: `out/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/manual/20260410T160139Z-elegance-review.md`.
- [x] The workpad and PR attachment reflect the current fresh-branch implementation state. Evidence: `out/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/manual/workpad.md`, PR `#432`.
- [ ] Unresolved actionable review threads are zero, or any waiver is recorded with evidence. Evidence: PR `#432` currently has active CodeRabbit review threads and no waiver.
- [ ] Issue-state handoff occurs only after the review drain and required checks are clean. Evidence: pending while PR `#432` remains blocked by a failed required check and active review feedback.
