---
id: 20260320-1305-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment
title: Coordinator Live Provider Child-Run Task Identity and Delegation Guard Contract Alignment
relates_to: docs/PRD-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment.md
risk: high
owners:
  - Codex
last_review: 2026-03-20
dependencies:
  - docs/findings/1305-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment-deliberation.md
  - docs/ACTION_PLAN-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment.md
  - tasks/tasks-1305-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment.md
---

## Summary
- Objective: Align provider-started fallback task ids with strict `delegation-guard` semantics so live provider child runs can progress beyond the current guard failure without weakening normal top-level delegation rules.
- Scope: one docs-first follow-up lane, one narrow provider/guard contract fix, focused regressions, required validation, and live rerun on the existing `CO-1` / `CO-2` provider setup.
- Constraints:
  - do not revisit provider setup or widen provider authority
  - ordinary top-level tasks must keep current registration and delegation evidence requirements

## Live Bug Context
- 2026-03-19 live rerun after `1304` proved webhook acceptance, provider lookup, and provider-intake claims, but both mapped child runs failed at `stage:delegation-guard:failed`.
- The failing task ids are current provider fallback ids like `linear-<issueId>`, recorded in `provider-intake-state.json` and in the child manifests.
- `1303` intentionally introduced that fallback contract when no explicit issue-level CO task carrier exists, so the failure is architectural contract drift between provider-started runtime identity and guard expectations.

## Technical Requirements
1. The sanctioned provider-started fallback contract must be explicit and auditable from active run launch provenance plus a matching control-host provider-intake claim; manifest `issue_*` fields alone are insufficient proof.
2. The active manifest for either a sanctioned provider-started run or a delegated child under that provider task must be `in_progress` and must match the current task id, or `delegation-guard` must fail closed.
3. Once a matched provider claim has `run_manifest_path`, the active run must use that same manifest path or `delegation-guard` must fail closed.
4. Delegated child runs under a sanctioned provider-started task id must remain valid when they use the normal `<task-id>-<stream>` subagent prefix, but only when the active child manifest carries `parent_run_id` continuity to the sanctioned provider parent run.
5. `delegation-guard` must continue to fail ordinary unregistered top-level task ids.
6. A sanctioned provider-started run is itself a delegated child of `control-host`, so matching provider proof may stand in for pre-existing `<task-id>-*` delegation evidence for that run only.
7. The implementation must not require a blanket `DELEGATION_GUARD_OVERRIDE_REASON` for provider-started runs.
8. The live rerun must still show accepted provider intake claims and must confirm the mapped child run clears `delegation-guard`, or else capture the next exact blocker.
9. The fix must preserve existing `providerIssueHandoff` semantics for stale-event rejection, duplicate suppression, and start-versus-resume behavior.

## Validation Plan
- Pre-implementation docs gate:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 1305-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment`
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
  - forged provider-flag regression proving unmatched top-level runs still fail
  - launch-provenance/path-continuity regressions proving provider claims cannot be reused by a different run
  - active-manifest regressions proving stale or mismatched current manifests cannot reuse a sanctioned provider contract
  - delegated-child regression proving sanctioned provider parents still authorize normal `<task-id>-<stream>` subagent prefixes
- Live verification:
  - verify the current control-host state files before rerun
  - rerun or observe the real started issue path for `CO-1` / `CO-2`
  - confirm the provider-started child run gets past `delegation-guard`
  - capture manifest/log evidence for the next blocker if one appears

## Approvals
- Reviewer: Codex docs-review approved on 2026-03-19. Evidence: `.runs/1305-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment/cli/2026-03-19T14-17-56-695Z-cbfe549d/manifest.json`
- Date: 2026-03-19
