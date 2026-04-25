# ACTION_PLAN - CO: repair archive automation auto-merge token

## Added by Bootstrap 2026-04-25

## Traceability
- Linear issue: `CO-362` / `fd4bf705-11a9-4717-948c-addfb4fa3f83`
- Linear URL: https://linear.app/asabeko/issue/CO-362/co-repair-archive-automation-auto-merge-token
- Source issue: `CO-356` / `56c2656d-853f-43f9-91af-455970800060`
- Source anchor: `ctx:sha256:becfd8cba79308cf736ffb09357d004b9d8b428a1389367239b753c92a9107d6#chunk:c000001`

## Summary
- Goal: repair archive automation auto-merge by fixing `ARCHIVE_AUTOMERGE_TOKEN` validity or permissions outside repo code, then prove that an archive PR with green required `Core Lane` can enable or complete archive auto-merge without `401 Bad credentials`.
- Scope: docs packet and mirrors in this child lane; parent-owned GitHub secret/permission repair, archive PR check verification, auto-merge verification, evidence capture, and issue closeout.
- Assumptions:
  - `CO-356` owns the checked-in required-check dispatch path and this issue owns only the independent token/permission failure
  - `Core Lane` remains the required archive PR gate and `Cloud Canary` is not a substitute
  - token repair happens through GitHub admin/settings surfaces outside repository files

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `ARCHIVE_AUTOMERGE_TOKEN`
  - `tasks-archive-automation`
  - `implementation-docs-archive-automation`
  - archive auto-merge
  - `401 Bad credentials`
  - `401 Unauthorized`
  - `Bad credentials`
  - `Core Lane`
  - `Cloud Canary`
- Not done if:
  - archive PRs still cannot auto-merge after `Core Lane` is green because `ARCHIVE_AUTOMERGE_TOKEN` remains invalid or under-scoped
  - the lane hides secret failures, logs secret values, or bypasses required checks
  - GitHub Actions evidence and archive PR outcome are not recorded on `CO-362`
  - the repair changes workflow files, scripts, tests, branch protection behavior, archive eligibility, or archive payload contents
- Pre-implementation issue-quality review:
  - 2026-04-25: the issue is sufficiently shaped for parent implementation. It is a credential/permission repair lane, not a repo-code archive automation rewrite, and the acceptance criteria require exact archive PR, `Core Lane`, auto-merge, and GitHub Actions evidence.

## Milestones & Sequencing
1. Register this `CO-362` docs-first packet in `docs/`, `tasks/`, `.agent/task/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Status: completed by accepted `docs-packet-cli` child lane.
2. Parent identifies the archive automation PR and GitHub Actions run that will serve as the verification target. Status: pre-fix evidence captured from `tasks-archive-automation` run `24922804853`, job `72987331541`, archive PR `#637`.
3. Parent confirms the required `Core Lane` path is green for that archive PR before testing auto-merge. Status: completed for pre-fix evidence; required `Core Lane` target run `24922814963` completed `success`.
4. Parent rotates or repairs `ARCHIVE_AUTOMERGE_TOKEN` permissions outside repo code. Status: completed; repository Actions secret `ARCHIVE_AUTOMERGE_TOKEN` updated at `2026-04-25T06:17:28Z` without exposing the token value.
5. Parent reruns or triggers archive auto-merge evidence and verifies the PR can enable or complete archive auto-merge without `401 Bad credentials`.
6. Parent records redacted GitHub Actions evidence, archive PR outcome, and final issue closeout on `CO-362`.

## Dependencies
- `ARCHIVE_AUTOMERGE_TOKEN`
- `tasks-archive-automation`
- `implementation-docs-archive-automation`
- archive auto-merge
- GitHub Actions
- required `Core Lane`
- GitHub repository or organization secret/permission administration
- Parent-owned Linear workpad and PR lifecycle

## Validation
- Child-lane checks:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `git diff --check -- docs/PRD-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md docs/TECH_SPEC-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md docs/ACTION_PLAN-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md tasks/specs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md tasks/tasks-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md .agent/task/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
  - targeted protected-term `rg` check across the packet and mirrors
- Parent checks:
  - archive PR required `Core Lane` is green before archive auto-merge testing
  - `ARCHIVE_AUTOMERGE_TOKEN` has been rotated or permissioned outside repo code
  - archive auto-merge can enable or complete without `401 Bad credentials`
  - GitHub Actions evidence and archive PR outcome are recorded on `CO-362`
- Rollback plan:
  - if the token repair cannot be verified without changing repo files or branch protection, stop and relaunch with a widened issue after parent records the blocker
  - if archive auto-merge still returns `401 Bad credentials`, keep `CO-362` active and capture the redacted failing run evidence for the next credential repair attempt

## Risks & Mitigations
- Risk: secret repair evidence leaks token values.
  - Mitigation: record only token name, GitHub Actions run, PR, permission summary, and redacted outcome.
- Risk: auto-merge testing happens before required checks are actually green.
  - Mitigation: make green required `Core Lane` evidence the first parent validation gate.
- Risk: a workflow edit masks a credential problem.
  - Mitigation: keep workflow files, scripts, tests, archive eligibility, archive payloads, and branch protection out of scope.
- Risk: `Cloud Canary` is mistaken for the required check.
  - Mitigation: call out `Cloud Canary` as an explicit non-goal substitute and require `Core Lane`.

## Approvals
- Reviewer: parent provider worker after patch import
- Date: 2026-04-25
