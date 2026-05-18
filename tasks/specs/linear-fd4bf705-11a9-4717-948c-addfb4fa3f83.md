---
id: 20260425-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83
title: CO: repair archive automation auto-merge token
status: in_progress
owner: Codex
created: 2026-04-25
last_review: 2026-05-18
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md
related_action_plan: docs/ACTION_PLAN-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md
related_tasks:
  - tasks/tasks-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md
review_notes:
  - 2026-04-25: Bounded docs child lane read `CO-362` live in Linear in read-only mode because the provided source payload contained lane metadata only. The issue narrows this lane to `ARCHIVE_AUTOMERGE_TOKEN` secret or permission repair after `CO-356`; repository workflow, script, test, branch-protection, archive eligibility, and archive payload changes are out of scope for this packet.
  - 2026-04-25: Pre-implementation issue-quality review confirms the issue is not a broader archive automation rewrite. The protected surfaces are `ARCHIVE_AUTOMERGE_TOKEN`, `tasks-archive-automation`, `implementation-docs-archive-automation`, archive auto-merge, and `401 Bad credentials`; `Core Lane` must remain the required check and `Cloud Canary` must not be treated as a replacement.
  - 2026-04-25: Parent confirmed pre-fix `tasks-archive-automation` run `24922804853` created archive PR `#637`; required `Core Lane` target run `24922814963` completed `success` before the optional auto-merge step returned `401 Unauthorized` / `Bad credentials`. Parent rotated repository Actions secret `ARCHIVE_AUTOMERGE_TOKEN` outside repo code at `2026-04-25T06:17:28Z` without exposing the token value.
  - 2026-05-18: CO-522 active-spec audit found 3 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Summary
- Objective: repair the `ARCHIVE_AUTOMERGE_TOKEN` secret or permission problem that makes archive automation auto-merge fail with `401 Bad credentials` after the required archive PR check path is green.
- Scope: docs-first packet and mirrors in this child lane; parent-owned GitHub secret or permission repair, archive PR verification, GitHub Actions evidence capture, and issue closeout.
- Constraints:
  - do not edit workflow files, scripts, tests, secrets, or branch protection behavior from this docs child lane
  - do not call Linear mutation helpers from this child lane
  - do not expose token values in repo files, logs, comments, or issue evidence
  - preserve `ARCHIVE_AUTOMERGE_TOKEN`, `tasks-archive-automation`, `implementation-docs-archive-automation`, archive auto-merge, and `401 Bad credentials` exactly

## Issue-Shaping Contract
- User-request translation carried forward: `CO-362` is the follow-up lane for the independent archive auto-merge credential failure found during `CO-356`. Parent must confirm an archive PR has green required `Core Lane`, repair or rotate `ARCHIVE_AUTOMERGE_TOKEN` outside repo code, verify archive auto-merge can enable or complete without `401 Bad credentials`, and record GitHub Actions evidence plus PR outcome on the issue.
- Protected terms / exact artifact and surface names:
  - `ARCHIVE_AUTOMERGE_TOKEN`
  - `tasks-archive-automation`
  - `implementation-docs-archive-automation`
  - archive auto-merge
  - `401 Bad credentials`
  - `401 Unauthorized`
  - `Bad credentials`
  - `Core Lane`
  - `Cloud Canary`
  - GitHub Actions
  - archive PR
- Nearby wrong interpretations to reject:
  - changing checked-in workflow files to work around a credential failure
  - weakening branch protection or bypassing required checks
  - using `Cloud Canary` as a substitute for `Core Lane`
  - logging, committing, or otherwise exposing secret values
  - changing archive eligibility or archive payload contents
  - treating this as still owned by the `CO-356` required-check dispatch code path
- Explicit non-goals carried forward:
  - Do not weaken branch protection.
  - Do not embed tokens in repository files.
  - Do not change archive eligibility or archive payload contents.
  - Do not treat `Cloud Canary` as a replacement for `Core Lane`.
  - Do not touch workflow files, scripts, tests, secrets, or branch protection behavior from this docs child lane.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Required-check gating | `CO-356` split out repo-code required-check dispatch from this credential failure. | Archive PR auto-merge should be tested only after required `Core Lane` is green. | Parent records green `Core Lane` evidence for an archive PR before auto-merge verification. | `Cloud Canary` as replacement evidence, branch-protection bypasses, required-check weakening. |
| Credential health | GitHub Actions showed `ARCHIVE_AUTOMERGE_TOKEN` returning `401 Unauthorized` / `Bad credentials`. | Archive auto-merge uses a valid credential with sufficient permissions. | Token or permissions are rotated/repaired outside repo code and no longer produce `401 Bad credentials`. | Committing token values or changing repo workflow code to hide the failure. |
| Archive automation scope | `tasks-archive-automation` and `implementation-docs-archive-automation` are the protected archive automation surfaces. | Existing archive eligibility and payload semantics remain stable. | Only the credential/permission path changes; archive automations keep their current repo behavior. | Archive eligibility changes, archive payload changes, workflow file edits, script edits, tests. |
| Evidence capture | The issue records the token name and error class, not a token value. | Closeout evidence should be auditable without exposing secrets. | Parent records GitHub Actions run evidence, archive PR outcome, and redacted credential repair summary. | Secret value logging, screenshots or logs that leak credential material. |

## Readiness Gate
- Not done if:
  - Archive PRs still cannot auto-merge after `Core Lane` is green because `ARCHIVE_AUTOMERGE_TOKEN` remains invalid or under-scoped.
  - The lane hides secret failures, logs secret values, or bypasses required checks.
  - The parent does not record GitHub Actions evidence and archive PR outcome on `CO-362`.
  - The final evidence treats `Cloud Canary` as a replacement for `Core Lane`.
  - The repair changes workflow files, scripts, tests, branch protection behavior, archive eligibility, or archive payload contents.
- Pre-implementation issue-quality review evidence:
  - 2026-04-25: issue body and acceptance criteria were read live in Linear read-only mode. The packet preserves the exact protected terms and keeps implementation ownership outside repo code.
- Safeguard ownership split:
  - child lane owns only this docs-first packet and mirrors
  - parent lane owns GitHub admin/secret repair, Linear state/workpad, PR lifecycle, GitHub Actions evidence, and closeout
  - no child lane mutation helper calls or full repo validation suites

## Technical Requirements
- Functional requirements:
  - confirm a concrete archive PR has green required `Core Lane` before auto-merge testing
  - repair or rotate `ARCHIVE_AUTOMERGE_TOKEN` permissions outside checked-in repo code
  - verify archive auto-merge can enable or complete without `401 Bad credentials`
  - record GitHub Actions run evidence and archive PR outcome on `CO-362`
  - redact secret values from all evidence
- Non-functional requirements (performance, reliability, security):
  - security: no secret values in repository files, logs, comments, issue evidence, or screenshots
  - reliability: evidence must show the required `Core Lane` path, not only a non-required or substitute signal
  - auditability: record the archive PR, GitHub Actions run, and auto-merge result with enough context for future triage
- Interfaces / contracts:
  - GitHub Actions run logs for archive automation
  - GitHub archive PR checks and auto-merge status
  - repository/organization secret or token permission configuration outside repo code
  - Linear `CO-362` evidence handoff owned by the parent lane

## Architecture & Data
- Architecture / design adjustments:
  - no repository architecture change is planned for this issue
  - parent should use GitHub admin or settings surfaces to repair token validity/permissions outside repo code
  - existing `tasks-archive-automation` and `implementation-docs-archive-automation` workflow behavior remains unchanged unless a new parent-owned issue widens scope
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - GitHub Actions
  - GitHub repository/organization secrets or token permissions
  - archive PR auto-merge
  - required `Core Lane`

## Validation Plan
- Child-lane docs validation:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `git diff --check -- docs/PRD-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md docs/TECH_SPEC-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md docs/ACTION_PLAN-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md tasks/specs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md tasks/tasks-linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md .agent/task/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
  - targeted `rg` check for protected terms in the packet and mirrors
- Parent validation:
  - identify an archive automation PR from `tasks-archive-automation` or `implementation-docs-archive-automation`
  - confirm the required `Core Lane` path is green for that archive PR
  - rotate or repair `ARCHIVE_AUTOMERGE_TOKEN` permissions outside repo code
  - rerun or trigger archive auto-merge evidence
  - verify the archive PR can enable or complete auto-merge without `401 Bad credentials`
  - record GitHub Actions evidence and PR outcome on `CO-362`
- Not run by this child lane:
  - full repo validation suites
  - workflow, script, or test validation
  - any command that mutates Linear, GitHub secrets, branch protection, or workflow state

## Open Questions
- Which post-rotation archive PR will parent use as the clean verification target after confirming `Core Lane` is green?
- Does the fixed credential need only repository-scoped permissions, or organization-level permissions for archive auto-merge?

## Approvals
- Reviewer: parent provider worker after patch import
- Date: 2026-04-25
