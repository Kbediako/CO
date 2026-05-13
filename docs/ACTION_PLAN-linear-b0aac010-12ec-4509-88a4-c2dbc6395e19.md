# ACTION_PLAN - CO: Audit remaining review-launch and compatibility alias seams after CO-88

## Added by Bootstrap 2026-04-11

## Summary
- Goal: finish the bounded CO-88 follow-up by turning the remaining compatibility seams into explicit keep/delete decisions with truthful repo-facing rationale.
- Scope:
  - docs-first packet and registry mirrors
  - audit of review-launch, legacy collab env, optional cloud-sync, and `requiresCloud` alias seams
  - minimal truthfulness updates plus focused validation
- Assumptions:
  - `review-launch-attempt`, collab env aliases, and cloud sync each still have active current-tree consumers unless the audit proves otherwise
  - the `requiresCloud` family is independent enough for a bounded same-issue child lane

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `keep-or-delete audit`
  - `review-launch-attempt`
  - `requiresCloud` / `requires_cloud`
  - `orchestrator/src/sync/**`
  - `rlmCodexRuntimeShell.ts`
- Not done if:
  - retained seams lack explicit rationale
  - behavior-heavy seams are deleted without focused proof
  - repo truth still leaves any remaining seam ambiguous
- Pre-implementation issue-quality review:
  - 2026-04-11 source inspection confirms the lane is narrower than a second repo-wide cleanup: the target seams are still imported, tested, or explicitly documented, so the correct move is a bounded audit plus truthfulness updates rather than broad deletion.

## Milestones & Sequencing
1. Register the docs-first packet, task mirrors, registry rows, `docs/TASKS.md` snapshot, and saved workpad source.
2. Run audited docs-review and continue only with packet-local or truthful baseline fallback evidence.
3. Complete the parent-owned seam audit while the child lane audits the `requiresCloud` family; integrate the child result.
4. Land the smallest code/doc truthfulness updates required by the audit, then run focused validation, standalone review, and an explicit elegance pass.

## Dependencies
- `linear child-stream --pipeline docs-review`
- `linear child-lane --action launch --stream requires-cloud-alias-audit ...`
- focused test suites for review wrapper, collab runtime, cloud sync, and execution mode policy

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-b0aac010-12ec-4509-88a4-c2dbc6395e19 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/opt/homebrew/lib/node_modules/@kbediako/codex-orchestrator/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-137-docs-review --format json`
  - focused tests for touched seam files
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke` when the final diff touches downstream-facing review/runtime surfaces
- Rollback plan:
  - revert only the bounded truthfulness comments or compatibility-narrowing changes for the audited seams if focused validation disproves the new verdict

## Risks & Mitigations
- Risk: a still-live compatibility path gets deleted because CO-88 already removed other debt.
  - Mitigation: keep/delete decisions require current import, runtime, test, and docs evidence.
- Risk: the lane drifts back into repo-wide cleanup.
  - Mitigation: hold scope to the four named seam families and spin off any new idea as a follow-up issue instead.
- Risk: docs-first gates hit a standing repo baseline.
  - Mitigation: record the truthful fallback rather than weakening the packet or hiding the baseline.

## Approvals
- Reviewer: Pending docs-review and final standalone review.
- Date: 2026-04-11
