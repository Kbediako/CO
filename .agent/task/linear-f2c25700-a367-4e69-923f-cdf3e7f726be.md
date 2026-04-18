# Task Checklist - linear-f2c25700-a367-4e69-923f-cdf3e7f726be

- Linear Issue: `CO-236` / `f2c25700-a367-4e69-923f-cdf3e7f726be`
- MCP Task ID: `linear-f2c25700-a367-4e69-923f-cdf3e7f726be`
- Primary PRD: `docs/PRD-linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`
- TECH_SPEC: `tasks/specs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`
- Shared source 0 anchor: `ctx:sha256:55bbd81d18cf34c96d4d069e257260e0ca3c460478c7cbafb7ed3e1372bb3ade#chunk:c000001`
- Current origin manifest: `.runs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be/cli/2026-04-18T10-17-30-911Z-84ff6b3d/manifest.json`

## Docs-First
- [x] PRD drafted for the clean-tree `tests/cli-command-surface.spec.ts` failure, preserving the protected terms and non-goals. Evidence: `docs/PRD-linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`.
- [x] TECH_SPEC drafted with the current cold-vs-warm split, proposed bounded harness fix, and focused validation contract. Evidence: `tasks/specs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`, `docs/TECH_SPEC-linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`.
- [x] ACTION_PLAN drafted for reproduction, focused implementation, and clean-tree validation. Evidence: `docs/ACTION_PLAN-linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated for the new packet. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`. Evidence: `.agent/task/linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec. Evidence: `tasks/specs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`.

## Workflow
- [x] `linear issue-context` inspected live team states before transition logic. Evidence: packaged `linear issue-context --issue-id f2c25700-a367-4e69-923f-cdf3e7f726be --format json`.
- [x] Issue already live in the team’s started state (`In Progress`) before coding, and the guarded `Ready` transition was rejected only because the state had already advanced. Evidence: packaged `linear transition ...` conflict plus rechecked `issue-context`.
- [x] Exactly one explicit same-turn parallelization decision was recorded for this turn. Evidence: packaged `linear parallelization --issue-id f2c25700-a367-4e69-923f-cdf3e7f726be --decision parallelize_now --reason independent_scope_available ...`.
- [x] Exactly one persistent `## Codex Workpad` comment is current. Evidence: Linear comment `cd837ba3-ee75-4795-9efc-84846c0f7995`, packaged `linear upsert-workpad --issue-id f2c25700-a367-4e69-923f-cdf3e7f726be --body-file out/linear-f2c25700-a367-4e69-923f-cdf3e7f726be/manual/workpad.md`.
- [x] At least one same-issue child lane completed successfully and was explicitly accepted, rejected, or invalidated by the parent before turn end. Evidence: `.runs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be-docs-source-evidence/cli/2026-04-18T10-21-22-613Z-591c451f/provider-linear-child-lane-proof.json` (`status: succeeded`, zero-byte patch auto-rejected by the parent helper).

## Investigation
- [x] Clean-tree reproduction confirmed the missing-dist failure in the focused CLI command-surface suite. Evidence: `npm run clean:dist`, then `npm run test:orchestrator -- tests/cli-command-surface.spec.ts` with 4 failing apply-path tests and repeated stderr `Delegation MCP requires a built dist entrypoint for stdio startup; missing /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js.`.
- [x] The cold-vs-warm explanation is documented before implementation. Evidence: `docs/PRD-linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`, `tasks/specs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`.
- [x] The lane remains explicitly separate from `CO-229` doctor-suite stabilization. Evidence: `docs/PRD-linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`, `tasks/specs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`, `out/linear-f2c25700-a367-4e69-923f-cdf3e7f726be/manual/workpad.md`.

## Implementation Acceptance
- [x] The bounded fix lands in the intended harness seam without changing the direct-dist delegation setup contract. Evidence: `tests/cli-command-surface.spec.ts` mocks `resolveDelegationServerInvocation(...)` only in the four apply-path tests; `orchestrator/tests/Doctor.test.ts` uses a temp-local direct-dist responder for startup-probe coverage; product direct-dist enforcement remains in `orchestrator/src/cli/utils/delegationMcpHealth.ts`.
- [x] Clean-tree `tests/cli-command-surface.spec.ts` passes without a prebuilt `dist/bin/codex-orchestrator.js`. Evidence: `npm run clean:dist`; `npm run test:orchestrator -- tests/cli-command-surface.spec.ts` -> 115 passed.
- [x] Clean-tree `npm run test` passes without a prebuilt `dist/bin/codex-orchestrator.js`. Evidence: `npm run clean:dist`; `npm run test` -> `344` files passed, `4162` tests passed.
- [x] The fix does not reopen `CO-229` or broaden into unrelated delegation/runtime work. Evidence: no product runtime files changed; `orchestrator/tests/Doctor.test.ts` only makes the direct-dist readiness unit test hermetic with a temp-local responder, leaving the timeout cluster untouched.

## Validation
- [x] `linear child-stream --pipeline docs-review` run recorded before implementation, or a truthful fallback note is captured if the wrapper stops on an external boundary. Evidence: `.runs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be-co-236-docs-review/cli/2026-04-18T10-30-59-859Z-92e540e9/manifest.json`; `review/telemetry.json` reports `status: succeeded`, `review_outcome: clean-success`.
- [x] Focused cold-state reproduction run completed with the expected missing-dist failure. Evidence: `npm run clean:dist`; `npm run test:orchestrator -- tests/cli-command-surface.spec.ts`.
- [x] Focused cold-state rerun passes after the fix. Evidence: `npm run clean:dist`; `npm run test:orchestrator -- tests/cli-command-surface.spec.ts`.
- [x] Focused overlap rerun covering clean-tree command-surface, doctor direct-dist readiness, and dist shebang checks passes after the fix. Evidence: `npm run clean:dist`; `npm run test:orchestrator -- tests/cli-command-surface.spec.ts orchestrator/tests/Doctor.test.ts tests/cli-build-config.spec.ts`.
- [x] Full clean-tree `npm run test` passes after the fix. Evidence: `npm run clean:dist`; `npm run test`.
- [x] Required validation floor is green before any review handoff. Evidence: `node scripts/delegation-guard.mjs`; `node scripts/spec-guard.mjs --dry-run`; `npm run build`; `npm run lint` (existing warnings only in `orchestrator/tests/DelegationMcpHealth.test.ts:893`, `:909`, `:911`); `npm run test`; `npm run docs:check`; `npm run docs:freshness`; `npm run repo:stewardship`; `DIFF_BUDGET_OVERRIDE_REASON='CO-236 requires the docs-first packet, task and registry mirrors, and the bounded clean-tree test repair in one provider-worker change.' node scripts/diff-budget.mjs`.
- [x] Standalone review and elegance review are captured before any review-state transition if the final diff is non-trivial. Evidence: wrapper-led `npm run review -- --manifest .runs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be/cli/2026-04-18T10-17-30-911Z-84ff6b3d/manifest.json` stalled without emitting `review/telemetry.json`, but its partial `review/output.log` surfaced the repo-`dist/` cleanup race and the weakened doctor startup-probe coverage; both were reworked, then a manual post-fix diff review and explicit elegance pass found no remaining correctness, regression, or minimality issues.

## Handoff
- [x] Workpad refreshed after docs-first, after implementation, and immediately before any review handoff. Evidence: `linear upsert-workpad --issue-id f2c25700-a367-4e69-923f-cdf3e7f726be --body-file out/linear-f2c25700-a367-4e69-923f-cdf3e7f726be/manual/workpad.md` updated comment `cd837ba3-ee75-4795-9efc-84846c0f7995` with final validation and handoff state.
- [x] PR attached before any review-state transition. Evidence: attached PR `https://github.com/Kbediako/CO/pull/537`; packaged `linear attach-pr --issue-id f2c25700-a367-4e69-923f-cdf3e7f726be --url https://github.com/Kbediako/CO/pull/537 --title "CO-236: hermetic clean-tree CLI command-surface coverage" --format json`.
- [x] Latest `origin/main` merged into the branch before review-state transition, PR checks are green, and `pr ready-review` drains cleanly. Evidence: `git fetch origin refs/heads/main:refs/remotes/origin/main`; `git merge --ff-only origin/main` -> `Already up to date.`; `codex-orchestrator pr ready-review --pr 537 --quiet-minutes 10 --timeout-minutes 20` finished with `Review handoff conditions satisfied and quiet window elapsed.`; `gh pr view 537 --json state,isDraft,mergeStateStatus,reviewDecision,url,comments,reviews` showed `mergeStateStatus=CLEAN`, zero unresolved threads, and a CodeRabbit approval with no actionable comments.
