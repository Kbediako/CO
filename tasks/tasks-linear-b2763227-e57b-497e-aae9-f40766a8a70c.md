# Task Checklist - linear-b2763227-e57b-497e-aae9-f40766a8a70c

- Linear Issue: `CO-301` / `b2763227-e57b-497e-aae9-f40766a8a70c`
- MCP Task ID: `linear-b2763227-e57b-497e-aae9-f40766a8a70c`
- Primary PRD: `docs/PRD-linear-b2763227-e57b-497e-aae9-f40766a8a70c.md`
- TECH_SPEC: `tasks/specs/linear-b2763227-e57b-497e-aae9-f40766a8a70c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b2763227-e57b-497e-aae9-f40766a8a70c.md`

## Docs-First
- [x] PRD drafted for the bounded bootstrap signal-forwarding flake lane. Evidence: `docs/PRD-linear-b2763227-e57b-497e-aae9-f40766a8a70c.md`.
- [x] TECH_SPEC drafted with the readiness-ordering root-cause hypothesis and bounded bootstrap fallback. Evidence: `tasks/specs/linear-b2763227-e57b-497e-aae9-f40766a8a70c.md`, `docs/TECH_SPEC-linear-b2763227-e57b-497e-aae9-f40766a8a70c.md`.
- [x] ACTION_PLAN drafted for docs-review, child-lane integration, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-b2763227-e57b-497e-aae9-f40766a8a70c.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-b2763227-e57b-497e-aae9-f40766a8a70c.md`. Evidence: `.agent/task/linear-b2763227-e57b-497e-aae9-f40766a8a70c.md`.
- [x] Pre-implementation issue-quality review is captured in the spec packet. Evidence: `tasks/specs/linear-b2763227-e57b-497e-aae9-f40766a8a70c.md`.
- [x] Docs-review child-stream evidence is captured, and the rebased current-main branch now clears the earlier repo-baseline blocker. Evidence: `.runs/linear-b2763227-e57b-497e-aae9-f40766a8a70c-co-301-docs-review/cli/2026-04-22T04-53-06-314Z-d7ec0fc6/manifest.json`, `npm run docs:check`, `npm run docs:freshness`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: provider-worker Linear transition recorded on 2026-04-22.
- [x] The required turn-level parallelization decision was recorded for this active turn. Evidence: provider-worker `parallelization` recorded as `parallelize_now` / `independent_scope_available` on 2026-04-22.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear workpad comment `cbf8d08c-6945-4f2d-8088-5ee7c9034789`.
- [x] At least one same-issue child lane completed successfully this turn before closeout. Evidence: `.runs/linear-b2763227-e57b-497e-aae9-f40766a8a70c-signal-forwarding-rerun/cli/2026-04-22T08-10-09-206Z-8b70da56/manifest.json`.

## Investigation
- [x] The current code audit identifies a plausible readiness-order race: the fixture prints `ready` before registering `SIGTERM`. Evidence: `tests/cli-source-bootstrap.spec.ts`.
- [x] Local history confirms the current polling helper was a prior symptom hardening, not the original readiness-contract fix. Evidence: `git show 7644a02d4 -- tests/cli-source-bootstrap.spec.ts`, `git show b93aca299 -- tests/cli-source-bootstrap.spec.ts`.
- [x] Focused child-lane characterization confirms the bounded fix can stay test-only. Evidence: `.runs/linear-b2763227-e57b-497e-aae9-f40766a8a70c-signal-forwarding-rerun/cli/2026-04-22T08-10-09-206Z-8b70da56/manifest.json`; the child lane returned a zero-byte advisory patch, and the parent confirmed on fresh `origin/main` that no tighter change was needed.

## Implementation
- [x] The signal-forwarding regression no longer permits `child-signal.txt` to be missing because readiness is reported too early. Evidence: `tests/cli-source-bootstrap.spec.ts:105`, `out/linear-b2763227-e57b-497e-aae9-f40766a8a70c/manual/20260422T082900Z-elegance-review.md`.
- [x] Checked-in bootstrap signal-forwarding coverage remains intact and meaningful. Evidence: `tests/cli-source-bootstrap.spec.ts:105`.
- [x] Remaining timing assumptions are reduced to the truthful `ready` contract; no extra platform-specific sleeps or retry policy were added. Evidence: `tests/cli-source-bootstrap.spec.ts:111`, `out/linear-b2763227-e57b-497e-aae9-f40766a8a70c/manual/20260422T082900Z-elegance-review.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-b2763227-e57b-497e-aae9-f40766a8a70c "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-301-docs-review --format json` executed, and the earlier repo-baseline blocker no longer reproduces on the rebased branch. Evidence: `.runs/linear-b2763227-e57b-497e-aae9-f40766a8a70c-co-301-docs-review/cli/2026-04-22T04-53-06-314Z-d7ec0fc6/manifest.json`, `npm run docs:check`, `npm run docs:freshness`.
- [x] Focused bootstrap signal-forwarding validation passes. Evidence: 20 repeated runs of `tests/cli-source-bootstrap.spec.ts -t 'forwards termination signals to the re-execed source entrypoint'` plus `node ../../node_modules/vitest/vitest.mjs run tests/cli-source-bootstrap.spec.ts`.
- [x] Required repo validation for the rebased branch is green on current main. Evidence: `node scripts/delegation-guard.mjs`; `node scripts/spec-guard.mjs --dry-run`; `npm run build`; `npm run lint`; `npm run test`; `npm run docs:check`; `npm run docs:freshness`; `npm run repo:stewardship`; `node scripts/diff-budget.mjs`.
- [x] `TASK=linear-b2763227-e57b-497e-aae9-f40766a8a70c FORCE_CODEX_REVIEW=1 npm run review -- --base origin/main` completed before handoff consideration for this non-trivial diff, with `review_outcome=bounded-success`. Evidence: `../../.runs/linear-b2763227-e57b-497e-aae9-f40766a8a70c/cli/2026-04-22T04-41-00-434Z-f9d71efe/review/telemetry.json`.
- [x] The final packet-only delta after that bounded review received a manual correctness pass when a follow-up review rerun drifted into unrelated control-host and Linear queue inspection instead of closing on the diff. Evidence: `out/linear-b2763227-e57b-497e-aae9-f40766a8a70c/manual/20260422T084600Z-final-manual-review.md`.
- [x] Explicit elegance review recorded before any review handoff if the diff is non-trivial. Evidence: `out/linear-b2763227-e57b-497e-aae9-f40766a8a70c/manual/20260422T082900Z-elegance-review.md`.

## Handoff
- [x] Workpad refreshed after docs, after implementation, and immediately before blocked or review handoff. Evidence: Linear workpad comment `cbf8d08c-6945-4f2d-8088-5ee7c9034789`, `out/linear-b2763227-e57b-497e-aae9-f40766a8a70c/manual/20260422T051430Z-workpad.md`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [x] Latest `origin/main` is merged into the branch before review-state transition. Evidence: branch `linear/co-301-bootstrap-signal-forwarding-main` now tracks `origin/main` and contains only this issue commit on top.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- Pending handoff steps: create and attach the PR, drain `pr ready-review`, then transition the issue to `In Review`.
