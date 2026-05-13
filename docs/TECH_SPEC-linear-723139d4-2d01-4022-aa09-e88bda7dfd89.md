---
id: 20260328-linear-723139d4-2d01-4022-aa09-e88bda7dfd89
title: Fix Repo-wide Full-Suite npm run test Post-Suite Idling and ProviderIssueHandoff Instability
relates_to: docs/PRD-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md
risk: high
owners:
  - Codex
last_review: 2026-03-28
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`
- PRD: `docs/PRD-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`
- Task checklist: `tasks/tasks-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`

## Traceability
- Linear issue: `CO-24` / `723139d4-2d01-4022-aa09-e88bda7dfd89`
- Linear URL: https://linear.app/asabeko/issue/CO-24/co-fix-repo-wide-full-suite-npm-run-test-instability-around

## Summary
- Objective: Identify and remove the surviving cause of non-terminal full-suite `npm run test` behavior on current CO `main`, or land an explicit repo-owned mitigation contract if elimination cannot be achieved within the bounded lane.
- Scope:
  - docs-first registration for `CO-24`
  - durable baseline reproduction evidence in this workspace
  - targeted handle-owner isolation around the late-suite hang
  - the smallest production or test cleanup fix that restores truthful terminal behavior, or an explicit validation contract
  - focused and full validation before review handoff
- Constraints:
  - do not fold this lane into `CO-14` or `CO-28`
  - do not mask the issue with a silent quiet-window kill
  - keep the implementation bounded to the proven owner

## Technical Requirements
- Functional requirements:
  - reproduce the current-main non-terminal behavior in this workspace and record durable evidence
  - identify the owning cause of the late-suite failure or surviving idle path with concrete process, handle, or code-path evidence
  - patch the smallest responsible seam so `npm run test` prints a terminal Vitest summary and exits cleanly
  - if elimination is not feasible in-lane, document and adopt an explicit repo-owned mitigation/waiver contract instead of silently masking the hang
  - verify the chosen outcome on both a clean reproduction path and the blocker branch
- Non-functional requirements (performance, reliability, security):
  - preserve existing changed-area validation discipline
  - avoid broad harness rewrites or unrelated provider/runtime refactors
  - keep the reproduction and validation flow auditable through repo-stored artifacts, task docs, and manifests
- Interfaces / contracts:
  - `npm run test` must remain the authoritative repo-wide local validation entrypoint
  - any adopted mitigation must be explicit in task docs, workpad state, and validation evidence
  - review handoff cannot claim green repo-wide validation unless the full-suite result is terminally truthful

## Architecture & Data
- Architecture / design adjustments:
  - begin with repo-wide reproduction evidence, then narrow by likely handle owners: server-owning helpers, lingering timers, watcher/process seams, and late-suite CLI tests
  - prefer fixing cleanup/teardown at the exact offending seam over adding outer supervisory termination
  - keep temporary reproduction logs supplemental and copy durable findings into `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/`
- Data model changes / migrations:
  - none expected unless the adopted mitigation requires additive documentation or validation metadata only
- External dependencies / integrations:
  - Vitest
  - Node child-process and HTTP server behavior in test helpers
  - existing provider/control-host test seams implicated by prior evidence

## Validation Plan
- Tests / checks:
  - docs-review before implementation
  - focused reproduction/isolation commands against suspected files or suites
  - targeted regressions for the chosen fix
  - full repo validation floor after implementation, including `npm run test`
- Rollout verification:
  - confirm full-suite execution emits a terminal Vitest footer and exits cleanly
  - confirm the blocker branch and a clean reproduction path both match the chosen outcome
  - confirm dependent-lane docs can truthfully clear this blocker
- Monitoring / alerts:
  - durable manual reproduction notes under `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/`
  - workpad updates before review handoff documenting whether the blocker is fully fixed or explicitly contracted

## Open Questions
- Is the surviving owner in provider handoff tests, another late-suite server helper, or a child-process seam that only manifests repo-wide?
- If the root cause spans multiple test files, what is the smallest high-signal fix that still restores truthful terminal behavior?

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-28
