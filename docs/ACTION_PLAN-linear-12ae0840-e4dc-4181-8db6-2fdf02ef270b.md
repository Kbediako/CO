# ACTION_PLAN - CO: harden cloud preflight command spawn ETXTBSY handling

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-372` / `12ae0840-e4dc-4181-8db6-2fdf02ef270b`
- Linear URL: https://linear.app/asabeko/issue/CO-372/co-harden-cloud-preflight-command-spawn-etxtbsy-handling

## Summary
- Goal: finish CO-372 by hardening cloud preflight command spawning so synchronous `spawn ETXTBSY` failures become structured unavailable preflight issues.
- Scope: docs-first packet, child-lane test ownership, docs-review, minimal `runCommand` hardening, focused `CloudPreflight.test.ts` coverage, validation, review, and review-handoff preparation.
- Assumptions:
  - the CI failure was an OS-level spawn race and not a CO-354 logic regression
  - existing cloud preflight classification behavior is the correct contract to preserve
  - the implementation can stay bounded to `cloudPreflight.ts` plus focused tests

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `ETXTBSY`, `spawn`, `runCloudPreflight`, `runCommand`, `cloudPreflight.ts`, `CloudPreflight.test.ts`, `codex_unavailable`, `Core Lane`, `PR #656`, `run 24931102291`, `job 73008894727`.
- Not done if: synchronous spawn failures still throw out of `runCloudPreflight`, regression coverage does not exercise synchronous spawn, or cloud preflight validation semantics are weakened.
- Pre-implementation issue-quality review: parent confirmed the issue is about command-spawn hardening, not CO-354 multi-agent config; no attached PR existed at start; workpad and parallelization proof were created before implementation.

## Milestones & Sequencing
1) Register docs-first artifacts, task mirrors, `tasks/index.json`, docs freshness entries, and `docs/TASKS.md` snapshot.
2) Run or explicitly record a docs-review child stream before implementation.
3) Inspect the existing `runCommand` / `runCloudPreflight` behavior and integrate child-lane test output when available.
4) Patch the minimal synchronous `spawn(...)` failure handling in `cloudPreflight.ts`.
5) Run focused validation, then repo-required guards/checks scaled to the diff.
6) Run standalone review and an explicit elegance/minimality pass before PR/review handoff.

## Dependencies
- `orchestrator/src/cli/utils/cloudPreflight.ts`
- `orchestrator/tests/CloudPreflight.test.ts`
- Linear issue `CO-372` workpad and child-lane evidence
- Existing cloud preflight docs/spec guardrails

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review`
  - focused `CloudPreflight.test.ts` regression run
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review` / `npm run review`
  - `npm run pack:smoke` only if downstream-facing CLI/package/review-wrapper paths require it
- Rollback plan:
  - revert the `cloudPreflight.ts` and `CloudPreflight.test.ts` patch if it weakens classification semantics or fails focused cloud preflight coverage
  - keep CO-372 in an active state until a shaped unavailable result is proven or a concrete blocker is recorded

## Risks & Mitigations
- Risk: spawn mocking could make the test brittle across ESM/Vitest boundaries.
  - Mitigation: prefer the smallest existing test pattern; use production injection only if mocking is not reliable.
- Risk: changing `runCommand` could affect branch/git checks as well as Codex checks.
  - Mitigation: preserve the existing non-zero command result shape so all callers keep the same classification decisions.
- Risk: broadening into cloud policy could dilute the fix.
  - Mitigation: keep non-goals and protected terms in docs, workpad, and review notes.

## Approvals
- Reviewer: Parent provider worker manual docs-review fallback after child stream docs:check baseline failure.
- Date: 2026-04-25
