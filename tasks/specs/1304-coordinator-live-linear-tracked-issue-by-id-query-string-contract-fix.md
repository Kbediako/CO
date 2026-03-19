---
id: 20260319-1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix
title: Coordinator Live Linear Tracked-Issue By-Id Query String Contract Fix
relates_to: docs/PRD-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md
risk: high
owners:
  - Codex
last_review: 2026-03-19
dependencies:
  - docs/findings/1304-live-linear-tracked-issue-by-id-query-string-contract-fix-deliberation.md
  - docs/ACTION_PLAN-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md
  - tasks/tasks-1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md
---

## Summary
- Objective: Align the Linear exact-issue GraphQL query contract with the live provider API so autonomous intake can finish the tracked-issue lookup and handoff path.
- Scope: one docs-first follow-up lane, one query-type patch, one focused regression, host restart, and live rerun against `CO-1` / `CO-2`.
- Constraints:
  - do not revisit provider setup, webhook secret, public ingress, or Telegram
  - preserve the 1303 provider-intake and handoff design outside this exact query contract

## Live Bug Context
- 2026-03-19 live autonomous intake hit `dispatch_source_provider_request_failed` in `resolveLiveLinearTrackedIssueById(...)`.
- Operator-provided direct GraphQL proof isolated the contract mismatch: `Variable "$issueId" of type "ID!" used in position expecting type "String!"`.
- `CO-1` and `CO-2` are already `In Progress` in the real Linear API, so the post-fix rerun should exercise real started-issue intake without additional provider setup work.

## Technical Requirements
1. `buildLinearIssueByIdQuery(...)` must declare `$issueId: String!`.
2. The query body must continue to use `issue(id: $issueId)` with the existing tracked-issue selection set.
3. Focused regression coverage must assert the query declaration itself so the type cannot silently drift back to `ID!`.
4. `resolveLiveLinearTrackedIssueById(...)` must preserve its current success, scope-mismatch, and not-found behavior outside the query-type correction.
5. The live rerun must use the restarted persistent `control-host` and existing provider setup to confirm provider-intake claim plus child `start` or `resume` handoff, or capture the next exact blocker if lookup succeeds but a downstream step fails.

## Validation Plan
- Pre-implementation docs gate:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix`
- Implementation validation:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
  - explicit elegance review pass
- Live verification:
  - rebuild and restart `control-host`
  - rerun autonomous intake for `CO-1` / `CO-2`
  - capture provider-intake ledger and child-run manifest evidence

## Approvals
- Reviewer: Approved via docs-review manifest `.runs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/cli/2026-03-19T11-27-28-598Z-d4b0023c/manifest.json`
- Date: 2026-03-19
