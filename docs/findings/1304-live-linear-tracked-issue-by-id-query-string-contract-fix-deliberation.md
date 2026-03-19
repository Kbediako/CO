# Findings - 1304 Live Linear Tracked-Issue By-Id Query String Contract Fix

## Decision
- Open `1304` as a bounded live follow-up lane.

## Why This Is The Right Slice
- The live autonomous intake path has already reached the exact Linear tracked-issue lookup helper and produced one concrete provider failure: `dispatch_source_provider_request_failed`.
- The operator supplied direct GraphQL proof that the root cause is contract-local: `Variable "$issueId" of type "ID!" used in position expecting type "String!"`.
- The fix is cohesive and narrow: correct the variable declaration in `buildLinearIssueByIdQuery(...)`, lock it with focused regression coverage, then rerun the already-live host and started issues.

## Scope Boundaries
- In scope:
  - docs-first registration for the follow-up bug lane
  - exact query-contract fix in `linearDispatchSource.ts`
  - focused regression in `LinearDispatchSource.test.ts`
  - rebuild/restart plus live rerun against `CO-1` and `CO-2`
- Out of scope:
  - provider setup, webhook secret work, or public ingress work
  - Telegram revalidation
  - broader provider-intake, claim, or scheduler contract changes unless the live rerun reveals a new blocker after the query fix

## Risks
- The next live blocker may sit downstream in accepted-issue claim handling or child-run discovery once the query contract is corrected.
- Because this is a live rerun lane, the checklist and closeout must separate “query contract fixed” from “full autonomous intake verified” if a new blocker appears.

## Approval
- Approved for docs-first registration based on the live provider evidence and the bounded contract mismatch.
