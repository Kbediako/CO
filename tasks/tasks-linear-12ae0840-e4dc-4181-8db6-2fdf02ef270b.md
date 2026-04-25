# Task Checklist - linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b

- Linear Issue: `CO-372` / `12ae0840-e4dc-4181-8db6-2fdf02ef270b`
- MCP Task ID: `linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b`
- Primary PRD: `docs/PRD-linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`
- TECH_SPEC: `tasks/specs/linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`

## Docs-First
- [x] PRD drafted for `CO-372`. Evidence: `docs/PRD-linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`.
- [x] TECH_SPEC drafted for `CO-372`. Evidence: `tasks/specs/linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`, `docs/TECH_SPEC-linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`.
- [x] ACTION_PLAN drafted for `CO-372`. Evidence: `docs/ACTION_PLAN-linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`. Evidence: `.agent/task/linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b.md`.
- [x] Docs-review approved or fallback-reviewed the `CO-372` packet for implementation. Evidence: `.runs/linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b-docs-review/cli/2026-04-25T14-04-00-828Z-d9da1fa5/manifest.json`, `out/linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b/manual/20260425T1410Z-docs-review-fallback.md`.

## Investigation
- [x] Live Linear workflow states and the current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `linear issue-context --issue-id 12ae0840-e4dc-4181-8db6-2fdf02ef270b`, `linear transition --issue-id 12ae0840-e4dc-4181-8db6-2fdf02ef270b --state "In Progress"`.
- [x] The single active `## Codex Workpad` comment was created before implementation work. Evidence: Linear comment `5592a9d4-7699-49f0-8e7b-e3bd4292f487`.
- [x] Pre-turn decomposition matrix and parallelization decision were recorded before coding. Evidence: Linear workpad and `linear parallelization --decision parallelize_now --reason independent_scope_available`.
- [x] Same-issue tests child lane launched and accepted for `orchestrator/tests/CloudPreflight.test.ts`. Evidence: `.runs/linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b-tests-etxtbsy-spawn/cli/2026-04-25T13-56-30-930Z-fa234da8/manifest.json`.
- [x] Inspect `runCommand` / `runCloudPreflight` synchronous spawn behavior and classify the minimal implementation seam. Evidence: `orchestrator/src/cli/utils/cloudPreflight.ts`.

## Implementation
- [x] Catch synchronous `spawn(...)` failures in `orchestrator/src/cli/utils/cloudPreflight.ts`. Evidence: `orchestrator/src/cli/utils/cloudPreflight.ts`.
- [x] Add or accept focused `ETXTBSY` / synchronous-spawn regression coverage in `orchestrator/tests/CloudPreflight.test.ts`. Evidence: `orchestrator/tests/CloudPreflight.test.ts`.
- [x] Preserve existing success, environment-not-found, and unavailable classifications. Evidence: `npm run test:orchestrator -- CloudPreflight.test.ts`.

## Validation
- [x] `linear child-stream --pipeline docs-review --format json`. Evidence: `.runs/linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b-docs-review/cli/2026-04-25T14-04-00-828Z-d9da1fa5/manifest.json` (failed on unrelated CO-276 docs:check baseline; fallback review recorded).
- [x] Focused `CloudPreflight.test.ts` regression run. Evidence: `npm run test:orchestrator -- CloudPreflight.test.ts` (5 tests passed).
- [x] `node scripts/delegation-guard.mjs`. Evidence: passed with 2 subagent manifests found.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: exited 0; reported pre-existing stale-spec advisory findings.
- [x] `npm run build`. Evidence: passed.
- [x] `npm run lint`. Evidence: passed with existing `DelegationMcpHealth.test.ts` `no-explicit-any` warnings.
- [x] `npm run test`. Evidence: passed 346 test files / 4425 tests.
- [x] `npm run docs:check`. Evidence: ran and failed on unrelated pre-existing CO-276 missing-path references in `docs/TASKS.md`.
- [x] `npm run docs:freshness`. Evidence: ran and failed on unrelated pre-existing missing/stale docs registry baseline including CO-276 references.
- [x] `npm run repo:stewardship`. Evidence: passed with 0 action-required files.
- [x] `node scripts/diff-budget.mjs`. Evidence: passed after pruning generated child-lane worktree artifacts.
- [x] Standalone review before review handoff. Evidence: `review/telemetry.json` status `succeeded`, `review_outcome` `bounded-success`; no actionable findings.
- [x] Explicit elegance/minimality pass before review handoff. Evidence: `out/linear-12ae0840-e4dc-4181-8db6-2fdf02ef270b/manual/20260425T1431Z-elegance-review.md`.

## Delivery
- [ ] Open or update a PR, attach it to Linear, and drain automated feedback before any review-state transition.
- [ ] Merge latest `origin/main` into the branch, refresh the workpad, and stop coding once the issue reaches `In Review` or `Human Review`.
