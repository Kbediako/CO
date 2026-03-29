---
id: 20260328-linear-9b2a195b-4603-4ed4-98c6-20eff87049e4
title: Fix Active Provider-Worker Linear Write-Back When Reads Succeed
relates_to: docs/PRD-linear-9b2a195b-4603-4ed4-98c6-20eff87049e4.md
risk: high
owners:
  - Codex
last_review: 2026-03-28
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-9b2a195b-4603-4ed4-98c6-20eff87049e4.md`
- PRD: `docs/PRD-linear-9b2a195b-4603-4ed4-98c6-20eff87049e4.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9b2a195b-4603-4ed4-98c6-20eff87049e4.md`
- Task checklist: `tasks/tasks-linear-9b2a195b-4603-4ed4-98c6-20eff87049e4.md`

## Traceability
- Linear issue: `CO-33` / `9b2a195b-4603-4ed4-98c6-20eff87049e4`
- Linear URL: https://linear.app/asabeko/issue/CO-33/co-fix-active-provider-worker-linear-write-back-when-reads-succeed

## Summary
- Objective: Restore reliable active-lane Linear state/workpad write-back for provider workers when a live read has already succeeded.
- Scope:
  - bounded docs-first registration for `CO-33`
  - live root-cause confirmation from the provider-worker audit trail and raw Linear responses
  - explicit rate-limit classification in the Linear GraphQL client
  - run-scoped reuse of successful `issue-context` data for `transition` and `upsert-workpad`
  - focused regressions and normal validation before review handoff
- Constraints:
  - keep the fix inside the provider-worker live Linear mutation path
  - do not widen into generic workpad formatting or unrelated control-host reconciliation work
  - keep any caching bounded to the active run scope rather than a global cross-run store

## Technical Requirements
- Functional requirements:
  - classify Linear hourly request-budget exhaustion explicitly instead of reporting it as a generic `linear_request_failed`
  - reuse a successful run-scoped `issue-context` result for immediately-following `transition` and `upsert-workpad` operations when it matches the same issue/source binding
  - update cached issue state/workpad comment on successful mutations so subsequent commands in the same attempt do not need a fresh read first
  - preserve live fallback reads when no trusted run-scoped cache exists
  - add focused regressions covering the read-succeeds / write-fails seam for both `transition` and `upsert-workpad`
- Non-functional requirements (performance, reliability, security):
  - do not silently mask true rate-limit exhaustion; include actionable metadata
  - keep the cache file local to the active run artifact directory and safe to ignore outside provider-worker runs
  - preserve existing behavior for non-provider-worker/manual use when no run-scoped cache exists
- Interfaces / contracts:
  - `orchestrator/src/cli/control/linearGraphqlClient.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - packaged `linear issue-context`, `linear transition`, and `linear upsert-workpad`
  - provider-worker audit env `CODEX_PROVIDER_LINEAR_AUDIT_PATH`

## Architecture & Data
- Architecture / design adjustments:
  - parse GraphQL error payloads even on non-2xx responses when Linear returns JSON, so rate-limit responses keep their real classification
  - derive a run-scoped issue-context cache path from the existing provider-worker Linear audit path
  - write successful `issue-context` results into that cache, consult it for `transition` and `upsert-workpad`, and patch the cached issue state/comment on mutation success
  - keep live-read fallback behavior when the cache is missing, mismatched, or invalid
- Data model changes / migrations:
  - add a run-scoped serialized issue-context cache artifact next to the provider-worker Linear audit file
  - no persisted repo data migrations
- External dependencies / integrations:
  - Linear GraphQL API rate-limit behavior
  - provider-worker run artifact directories under `.runs/linear-*/cli/*/`

## Validation Plan
- Tests / checks:
  - focused client tests for non-2xx GraphQL error parsing and rate-limit classification
  - focused facade tests proving cached `issue-context` reuse for `transition` and `upsert-workpad`
  - required repo validation floor after implementation
- Rollout verification:
  - confirm the raw upstream failure class is captured as rate limiting with request/reset metadata
  - confirm `transition` and `upsert-workpad` no longer require a second live read after a successful cached `issue-context` in tests
  - confirm closeout states whether live post-fix verification was completed or blocked by the current hourly reset window
- Monitoring / alerts:
  - keep evidence in the current run workpad plus `out/linear-9b2a195b-4603-4ed4-98c6-20eff87049e4/manual/`

## Open Questions
- Should `delete-workpad` also update the same run-scoped cache immediately for consistency?
- Is a future combined write command worth pursuing if request-budget pressure still causes same-attempt failures after cached preflight reuse?

## Approvals
- Reviewer: docs-review approved via `/Users/kbediako/Code/CO/.runs/linear-9b2a195b-4603-4ed4-98c6-20eff87049e4/cli/2026-03-28T11-44-12-656Z-a99f3693/manifest.json`
- Date: 2026-03-28
