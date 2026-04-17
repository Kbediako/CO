# ACTION PLAN - CO: Clear Codex 0.121 Cloud Canary Promotion Gate

## Summary
- Goal: clear CO-207 by producing passing required and fallback Codex CLI `0.121.0` cloud canary evidence, or stop with an explicit blocker if a real external dependency remains.
- Scope: docs-first packet, narrow fallback wrapper classification fix, focused tests, current canary reruns, Linear workpad, PR handoff.
- Assumptions: `CODEX_CLOUD_ENV_ID` is present for this worker attempt; no owner-approved waiver exists; CO-196 marketplace descriptors remain out of scope.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `CO-207`, `CO-196`, Codex CLI `0.121.0`, `CODEX_CLOUD_ENV_ID`, `CODEX_CLOUD_CANARY_REQUIRED=1`, `CLOUD_CANARY_EXPECT_FALLBACK=1`, `issue_blocked_by`, `cloud_fallback.mode_used=mcp`.
- Not done if: fallback canary still exits failed after expected fallback evidence, required cloud execution lacks a cloud task, or CO-196 lacks CO-207 blocker evidence.
- Pre-implementation issue-quality review: approved on 2026-04-17 after current evidence isolated the remaining failure to local wrapper classification, not cloud admission.

## Milestones & Sequencing
1. Capture live Linear state, blocker intake, required canary pass, and fallback failure evidence.
2. Draft docs-first packet and run docs-review before implementation.
3. Patch `scripts/cloud-canary-ci.mjs` so expected fallback configuration evidence is accepted only after fallback assertions pass.
4. Add focused test coverage using fake command surfaces and rerun scoped tests.
5. Re-run required and fallback CO-207 canaries and update workpad with artifacts.
6. Run repo gates, standalone review, elegance pass, open/update PR, run ready-review drain, and hand off to `In Review` only when clean.

## Dependencies
- Codex Cloud environment remains available.
- `origin/main` branch remains available for cloud canary runs.
- Linear issue CO-196 remains blocked by CO-207 while this issue is open.

## Validation
- Checks / tests:
  - `npm run test -- --run tests/cloud-canary-ci.spec.ts` or equivalent focused Vitest invocation.
  - `CODEX_CLOUD_ENV_ID=<env-id> CODEX_ORCHESTRATOR_CLOUD_FALLBACK=deny CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`
  - `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary`
  - Required repo gates from AGENTS.md.
- Rollback plan: revert the wrapper predicate and test if fallback evidence acceptance masks any genuine failure in review.

## Risks & Mitigations
- Risk: accepting expected fallback configuration could hide real failures. Mitigation: only bypass the fatal classification when fallback assertions already prove the exact expected `missing_environment` fallback branch.
- Risk: cloud canary intermittency. Mitigation: record exact task/log/manifest evidence and keep CO-207 blocked if a real external blocker remains.

## Approvals
- Reviewer: Parent worker.
- Date: 2026-04-17
