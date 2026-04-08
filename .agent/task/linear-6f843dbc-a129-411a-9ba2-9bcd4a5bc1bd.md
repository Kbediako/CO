# Task Checklist - linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd

- Linear Issue: `CO-101` / `6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd`
- MCP Task ID: `linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd`
- Primary PRD: `docs/PRD-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`
- TECH_SPEC: `tasks/specs/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`, `docs/TECH_SPEC-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`, `docs/ACTION_PLAN-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`, `tasks/specs/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`, `tasks/tasks-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`, `.agent/task/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`.
- [x] docs-review child-stream evidence recorded after the repo-supported `docs/TASKS.md` trim; the rerun passed `spec-guard` and `docs:check` and then failed only on the standing repo-wide `docs:freshness` stale-doc baseline. Evidence: `.runs/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd-co-101-docs-review-rerun/cli/2026-04-08T02-39-52-501Z-2a53de89/manifest.json`, `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T024100Z-docs-review-fallback.md`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/workpad.md`, `https://linear.app/asabeko/issue/CO-101/co-make-ordinary-eligible-provider-worker-issues-actually-leverage#comment-e5f14bce`.

## Implementation
- [x] Packaged `linear` CLI exposes one parent-only ordinary-worker parallelisation decision helper with bounded decision and reason codes. Evidence: `orchestrator/src/cli/linearCliShell.ts`, `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`.
- [x] Provider-worker proof hydration reconstructs the latest decision from existing audit truth and keeps live proof refreshes deterministic. Evidence: `orchestrator/src/cli/linearCliShell.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`.
- [x] `provider_debug_snapshot` exposes the current decision, reason, summary, and recorded child-lane count so explicit serial/no-go truth is visible when `child_lanes` is empty. Evidence: `orchestrator/src/cli/control/providerIssueObservability.ts`, `orchestrator/tests/ProviderIssueObservability.test.ts`.
- [x] Ordinary provider-worker turn completion fails closed when no decision exists or when `parallelize_now` records no child lane. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Worker prompt contract explicitly requires the current-turn decision and ties `parallelize_now` to actual child-lane launch. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/LinearCliShell.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.

## Validation
- [x] Focused regressions cover decision validation, proof hydration, debug projection, fail-closed launch/non-launch behavior, current-turn child-lane counts, resumed-turn decision fixtures, forbid-parallel conflicts, mixed-ISO audit filtering, the green-path `parallelize_now` acceptance case, the green-path `forbid_parallel` no-launch case, and the pre-turn previous-attempt hydration guard. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/05a-focused-regressions.log` (`175/175` passed).
- [x] Ordinary replay artifacts prove both `parallelize_now` and explicit serial/no-go outcomes. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T132700Z-ordinary-provider-worker-parallelization-replay/summary.json`, `.runs/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/cli/20260408T132700Z-parallelize-now/provider-linear-worker-proof.json`, `.runs/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/cli/20260408T132700Z-stay-serial/provider-linear-worker-proof.json`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/04-lint.log`.
- [x] `npm run test` (`318/318` files, `3160/3160` tests passed). Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness` still fails only on the standing repo-wide stale-doc baseline (`282` stale docs total: `Task Packet 205`, `Task Mirror 41`, `Report Only 36`). Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/08-diff-budget.log`.
- [x] `FORCE_CODEX_REVIEW=1 npm run review` completed as successful bounded review completion. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/09-review.log`, `.runs/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/cli/2026-04-08T02-19-00-813Z-7a146cac/review/telemetry.json` (`status: succeeded`, `review_outcome: bounded-success`, `termination_boundary.kind: relevant-reinspection-dwell`).
- [x] Explicit elegance pass recorded before review handoff. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/11-elegance-review.md`.
- [x] `npm run pack:smoke`. Evidence: `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T075400Z-coderabbit-closeout/10-pack-smoke.log`.

## Handoff
- [x] PR attached to the issue. Evidence: `https://github.com/Kbediako/CO/pull/381`
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `In Review`.
