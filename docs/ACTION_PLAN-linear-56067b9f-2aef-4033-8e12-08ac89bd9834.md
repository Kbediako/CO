# ACTION_PLAN - CO: Restore unrelated full-suite baseline blocking CO-43 handoff

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-46` / `56067b9f-2aef-4033-8e12-08ac89bd9834`
- Linear URL: https://linear.app/asabeko/issue/CO-46/co-restore-unrelated-full-suite-baseline-blocking-co-43-handoff

## Summary
- Goal: finish `CO-46` by restoring or explicitly classifying the unrelated full-suite baseline failures that are blocking `CO-43` review handoff.
- Scope: docs-first packet, audited child docs-review, focused reproduction of the named suites, narrow baseline repair or blocker ownership, required validation, and review-ready workpad refresh once Linear rate limiting clears.
- Assumptions:
  - the active blocker is limited to the named branch-baseline suites rather than `CO-43` feature work itself
  - at least one of the observed failures may already have narrowed or disappeared on the current branch, so reproduction must establish current truth before code changes
  - a smaller test/runtime correction is preferable to any broad validation refactor
- Current status:
  - issue moved to `In Progress`
  - dedicated branch created from the current workspace commit
  - docs packet and focused reproduction are complete
  - the live code repair is limited to `tests/cli-frontend-test.spec.ts`
  - the remaining full-suite quiet-tail hang is separately owned by `CO-57`

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `Restore unrelated full-suite baseline blocking CO-43 handoff`
  - `Doctor.test.ts`
  - `UserConfigStageSets.test.ts`
  - `cli-frontend-test.spec.ts`
  - `npm run test`
- Not done if:
  - the named failures are not reproduced or explicitly owned
  - the final lane still leaves `CO-43` carrying unrelated baseline repair work
- Pre-implementation issue-quality review:
  - the issue is already scoped correctly as a baseline blocker lane separate from `CO-43`; implementation should resist drifting into feature changes and should use follow-up issues for any newly discovered unrelated work

## Milestones & Sequencing
1. Register the `CO-46` docs-first packet, update `tasks/index.json`, refresh `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, and mirror the checklist under `.agent/task/`.
2. Run the audited child `docs-review` stream and capture the manifest or a truthful fallback note if the wrapper boundary fails.
3. Reproduce the named suites and the full-suite baseline, then pin the exact current truth in the docs/workpad.
4. Implement the smallest baseline repair that makes the named failing seam truthful again, and record the surviving `CO-57` ownership for the separate full-suite quiet-tail hang.
5. Rerun focused validation, then `npm run test` far enough to confirm the named suites are green and the only remaining non-terminal blocker is the separately owned quiet-tail hang, followed by the required repo validation floor for the final diff.
6. Run standalone review first and then an explicit elegance/minimality pass before any handoff.
7. Refresh the workpad, attach/update PR state if the lane reaches handoff quality, and only then consider `In Review`.

## Dependencies
- `orchestrator/src/cli/doctor.ts`
- `orchestrator/src/cli/config/userConfig.ts`
- `orchestrator/src/cli/frontendTestCliRequestShell.ts`
- `orchestrator/tests/Doctor.test.ts`
- `orchestrator/tests/UserConfigStageSets.test.ts`
- `tests/cli-frontend-test.spec.ts`
- `skills/linear/SKILL.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-46-docs-review --format json`
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 npm run test:orchestrator -- Doctor.test.ts UserConfigStageSets.test.ts`
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 npx vitest run --config vitest.config.core.ts tests/cli-frontend-test.spec.ts`
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 FORCE_CODEX_REVIEW=1 npm run review`
- Rollback plan:
  - revert any repair that changes doctor, stage-set, or frontend-test behavior in a way that no longer matches the real contract under test
  - keep the issue active and file explicit ownership instead of forcing a partial or ambiguous closeout

## Risks & Mitigations
- Risk: the March 30 issue text may no longer match the branch’s live failures exactly.
  - Mitigation: start with fresh focused reproduction and only patch the still-live seam.
- Risk: a narrow fix for one named suite could still leave `npm run test` red elsewhere.
  - Mitigation: run the full suite before handoff and either repair the remaining blocker if still in scope or record explicit ownership, as with the separate `CO-57` quiet-tail hang.
- Risk: Linear rate limiting could delay required workpad refreshes.
  - Mitigation: keep the repo packet and local staged workpad body current, then retry the single workpad comment as soon as the reset window opens.

## Approvals
- Reviewer: docs-review approved; implementation validation completed; standalone review completed clean
- Remaining: PR checks and the separate `CO-57` quiet-tail still gate review handoff
- Date: 2026-04-01
