# Task Checklist - CO-374 archive Core Lane dispatch discovery break

- Linear Issue: `CO-374` / `d9cbfbc7-d653-463e-bf2a-878f0feac52f`
- Task id: `linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f`
- Branch: `co-374-archive-dispatch-break`
- PRD: `docs/PRD-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md`

## Checklist
- [x] Live issue context read and issue moved from `Ready` to `In Progress`.
- [x] Single Codex workpad created and required parallelization decision recorded.
- [x] Same-issue child lane `dispatch-validation` completed and was accepted. Evidence: `.runs/linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f-dispatch-validation/cli/2026-04-25T17-50-15-458Z-21e3a1b5/manifest.json`.
- [x] Workflow implementation breaks immediately after an unambiguous `RUN_ID` assignment. Evidence: `.github/workflows/archive-automation-base.yml`.
- [x] Existing workflow contract spec reconciled with the new behavior. Evidence: `tests/archive-automation-workflow.spec.ts`.
- [x] Focused validation harness proves no fixed delay remains and ambiguity still fails. Evidence: `tests/archive-automation-core-lane-dispatch.spec.ts`.
- [x] Focused Vitest passed: `npx vitest run --config vitest.config.core.ts tests/archive-automation-workflow.spec.ts tests/archive-automation-core-lane-dispatch.spec.ts`.
- [x] Required local validation floor passed through diff budget. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `CODEX_NON_INTERACTIVE=1 npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `git diff --check`.
- [x] Standalone review and explicit elegance pass complete before review handoff. Evidence: `../../.runs/linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f/cli/2026-04-25T17-47-06-075Z-eae318bc/review/telemetry.json` (`status=succeeded`, `review_outcome=bounded-success`, `termination_boundary.kind=command-intent` / `provenance=validation-runner`), `out/linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f/manual/elegance-review.md`.
- [ ] PR attached, automated feedback drain clean, and Linear moved to `In Review` only after required checks are green.

## Progress Log
- 2026-04-26: Workpad created, issue moved to `In Progress`, `parallelize_now` recorded, child lane accepted, workflow loop patched, and focused Vitest passed.
- 2026-04-26: Docs/spec/task packet registered after `delegation-guard` identified missing task registration in this issue workspace.
- 2026-04-26: Required local validation floor passed through diff budget; `npm run lint` passed with pre-existing `no-explicit-any` warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- 2026-04-26: Standalone review completed as bounded success with no actionable regressions; explicit elegance pass found no simplification edits.

## Relevant Files
- `.github/workflows/archive-automation-base.yml`
- `tests/archive-automation-workflow.spec.ts`
- `tests/archive-automation-core-lane-dispatch.spec.ts`
- `docs/PRD-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md`
- `docs/TECH_SPEC-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md`
- `docs/ACTION_PLAN-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md`
- `tasks/specs/linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md`

## Notes
- Intent checksum / parity matrix status: captured in PRD, TECH_SPEC, and mini spec.
- Subagent usage: `linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f-dispatch-validation`.
- No out-of-scope follow-up identified.
