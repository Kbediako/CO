# Task Checklist - linear-fd4bf705-11a9-4717-948c-addfb4fa3f83

- Linear Issue: `CO-362` / `fd4bf705-11a9-4717-948c-addfb4fa3f83`
- MCP Task ID: `linear-fd4bf705-11a9-4717-948c-addfb4fa3f83`
- Primary PRD: `docs/PRD-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md`
- TECH_SPEC: `tasks/specs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md`
- Shared source 0 anchor: `ctx:sha256:becfd8cba79308cf736ffb09357d004b9d8b428a1389367239b753c92a9107d6#chunk:c000001`

## Docs-First
- [x] PRD drafted for the `ARCHIVE_AUTOMERGE_TOKEN` archive auto-merge credential repair lane. Evidence: `docs/PRD-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md`.
- [x] TECH_SPEC drafted with protected token/check/automation terms, non-goal boundaries, parent-owned credential repair, and validation plan. Evidence: `tasks/specs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md`, `docs/TECH_SPEC-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md`.
- [x] ACTION_PLAN drafted for archive PR selection, `Core Lane` evidence, token repair, auto-merge verification, and redacted closeout. Evidence: `docs/ACTION_PLAN-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md` readiness gate.
- [x] Registry and mirrors updated inside this child-lane scope: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, docs TECH_SPEC mirror, and `.agent/task` mirror. Evidence: those files.

## Child-Lane Scope
- [x] Child lane stayed within the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit workflow files, scripts, tests, secrets, or branch protection behavior. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist.
- [x] Child lane did not run full repo validation suites. Evidence: this checklist.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Protected Terms
- [x] `ARCHIVE_AUTOMERGE_TOKEN` preserved exactly. Evidence: packet and mirrors.
- [x] `tasks-archive-automation` preserved exactly. Evidence: packet and mirrors.
- [x] `implementation-docs-archive-automation` preserved exactly. Evidence: packet and mirrors.
- [x] archive auto-merge preserved exactly. Evidence: packet and mirrors.
- [x] `401 Bad credentials` preserved exactly. Evidence: packet and mirrors.
- [x] `Core Lane` remains required and `Cloud Canary` is not a replacement. Evidence: PRD, TECH_SPEC, and ACTION_PLAN non-goals.

## Parent Implementation Acceptance
- [x] Parent confirms the required `Core Lane` path is green for an archive PR before testing auto-merge. Evidence: `tasks-archive-automation` run `24922804853` created archive PR `#637`; required `Core Lane` target run `24922814963` completed `success` before the optional auto-merge step attempted `gh pr merge --auto`.
- [x] Parent rotates or repairs `ARCHIVE_AUTOMERGE_TOKEN` permissions outside repo code. Evidence: GitHub Actions secret `ARCHIVE_AUTOMERGE_TOKEN` updated at `2026-04-25T06:17:28Z`; token value was supplied via stdin and was not printed or written to repo files.
- [ ] Parent verifies an archive automation PR can enable or complete auto-merge without `401 Bad credentials`. Evidence: pending parent archive PR outcome.
- [ ] Parent records GitHub Actions evidence and PR outcome on `CO-362`. Evidence: pre-fix archive run `24922804853` / job `72987331541` recorded `401 Unauthorized` / `Bad credentials` after green `Core Lane`; post-rotation archive PR outcome pending.

## Validation
- [x] `jq empty tasks/index.json docs/docs-freshness-registry.json`. Evidence: passed in this child lane.
- [x] `git diff --check -- docs/PRD-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md docs/TECH_SPEC-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md docs/ACTION_PLAN-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md tasks/specs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md tasks/tasks-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md .agent/task/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`. Evidence: passed in this child lane.
- [x] Targeted protected-term `rg` check across packet and mirrors. Evidence: passed in this child lane for `ARCHIVE_AUTOMERGE_TOKEN`, `tasks-archive-automation`, `implementation-docs-archive-automation`, archive auto-merge, `401 Bad credentials`, `Core Lane`, and `Cloud Canary`.
- [x] Parent validation passes on latest `origin/main` merge. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint` (3 pre-existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`), `npm run test` (352 files / 4777 tests on rerun after targeted retry cleared transient local runner timeouts), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs`.
- [x] Docs-review child stream passes. Evidence: `.runs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83-docs-review/cli/2026-04-25T06-27-05-138Z-eb39b4e3/manifest.json` with review telemetry `status=succeeded`, `review_outcome=clean-success`.
- [x] Final standalone review completed with bounded success. Evidence: `.runs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83/cli/2026-04-25T05-59-16-648Z-51caa7d8/review/telemetry.json` reports `status=succeeded`, `review_outcome=bounded-success`; the review raised one P2 about `docs/TASKS.md` reserve target.
- [x] P2 review disposition recorded. Evidence: the `docs/TASKS.md` mirror is explicitly required by `CO-362`, the file remains below the 450 hard limit at 441 lines, and changing archive payload contents is a non-goal for this lane, so no archive-payload patch is applied here.
- [x] Explicit elegance/minimality pass completed. Evidence: `out/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83/manual/elegance-review.md`.
- [x] `npm run pack:smoke` intentionally not run. Evidence: this branch touches docs/task packet and registry mirrors only, not CLI/package/skills/review-wrapper downstream npm surfaces.

## Handoff
- [x] Parent lane accepted the child patch, merged current `origin/main`, and kept branch diff scoped to the nine CO-362 docs/task files. Evidence: `git diff origin/main --stat`.
- [ ] Parent continues owning archive PR validation, PR lifecycle, ready-review drain, and Linear review-state transition. Evidence: pending PR.

## Progress Log
- 2026-04-25: Bounded same-issue child lane prepared the `CO-362` docs-first packet and registry mirrors only. The packet preserves protected terms: `ARCHIVE_AUTOMERGE_TOKEN`, `tasks-archive-automation`, `implementation-docs-archive-automation`, archive auto-merge, `401 Bad credentials`, `Core Lane`, and `Cloud Canary`.
- 2026-04-25: Parent invalidated the initial appserver `docs-packet` child lane after bounded no-output startup, relaunched `docs-packet-cli` under CLI runtime, accepted its docs-first packet from manifest `.runs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83-docs-packet-cli/cli/2026-04-25T06-07-45-642Z-4500fa92/manifest.json`, confirmed pre-fix archive PR `#637` had green required `Core Lane` run `24922814963`, and rotated `ARCHIVE_AUTOMERGE_TOKEN` outside repo code at `2026-04-25T06:17:28Z` without exposing the token value.
- 2026-04-25: Parent merged current `origin/main`, completed the local validation suite and docs-review, ran final standalone review with bounded-success telemetry, dispositioned the `docs/TASKS.md` reserve-target P2 as intentionally not addressed in this non-payload lane, and completed an explicit elegance/minimality pass.
- 2026-04-25: Parent refreshed onto latest `origin/main` again after PR creation, resolved the `tasks/index.json` registry overlap with the upstream CO-360 packet, reran validation, and opened attached PR `#648`.
