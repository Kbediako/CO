# ACTION_PLAN - CO: harden run-review direct-exec symlink handling without regressing subprocess harnesses

## Added by Bootstrap 2026-04-12

## Summary
- Goal: close CO-127 from a clean rework reset by proving the supported `run-review` surface on current `main` and landing the smallest correct direct-exec resolution.
- Scope: Rework bootstrap, docs-first packet, supported-surface proof, bounded direct-exec implementation if warranted, focused regression coverage, and the required review/validation gates.
- Assumptions:
  - the issue description still allows two truthful exits: prove non-support and codify it, or harden the seam if current supported paths require that
  - `tests/run-review.spec.ts` remains the authoritative subprocess-harness baseline
  - the prior PR `#402` is informational history only because it was closed before merge

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `scripts/run-review.ts`, `dist/scripts/run-review.js`, `NODE_OPTIONS=--preserve-symlinks-main`, `direct-execution guard parity with bin/codex-orchestrator.ts`, `tests/run-review.spec.ts`, `does not crash when stdout pipe closes early`
- Not done if:
  - the lane does not prove the current supported-path verdict
  - the chosen fix widens unsupported behavior or regresses the subprocess harness
  - validation omits either the direct-exec seam or the pipe-close regression
- Pre-implementation issue-quality review:
  - the issue is already correctly scoped to a narrow direct-exec seam and explicitly allows either bounded hardening or explicit non-support, so the only missing input is fresh evidence from current `main`

## Milestones & Sequencing
1. Completed: read live issue context, confirmed the issue is already in active `Rework`, swept attached PR `#402` feedback, recorded the same-turn `forbid_parallel` / `parent_only_mutation` decision, and reset branch `linear/co-127-run-review-symlink-hardening` to fresh `origin/main`.
2. Completed: drafted the docs-first packet, registered the task mirrors, and kept a local workpad source current while Linear shared-budget writes are blocked until `2026-04-12 08:44 AEST`.
3. Completed: the audited `docs-review` child stream succeeded cleanly for the refreshed packet at `.runs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d-docs-review-rework/cli/2026-04-11T22-05-57-080Z-760b999c/manifest.json`.
4. Completed: proved the current supported repo-local and packaged `run-review` entrypoints, confirmed there is still no installed standalone `run-review` bin, reproduced the same-directory symlink direct-exec silent no-op on current `main`, and chose the bounded hardening path because the seam is real and locally fixable.
5. Completed: implemented the focused code/test changes, preserved the existing subprocess smoke, passed the broader validation floor, and recorded clean parent standalone review plus explicit elegance review. Remaining work is operational only: publish the refreshed workpad once writes reopen, create the replacement PR, and drain the review handoff loop.

## Dependencies
- `package.json`
- `scripts/run-review.ts`
- `tests/run-review.spec.ts`
- `orchestrator/src/cli/reviewCliLaunchShell.ts`
- `orchestrator/tests/ReviewCliLaunchShell.test.ts`
- `skills/linear/SKILL.md`

## Validation
- Checks / tests:
  - audited `docs-review` child stream (or truthful fallback)
  - focused supported-path proof capture
  - focused direct-exec and launcher regression coverage
  - focused subprocess-harness coverage for `does not crash when stdout pipe closes early`
  - repo validation floor for the final non-trivial diff
  - standalone review followed by elegance review before handoff
- Rollback plan:
  - revert any direct-exec seam change and keep the packet evidence if validation shows the parity hardening destabilizes the subprocess harness

## Risks & Mitigations
- Risk: a naive symmetric parity patch recreates the timeout pressure called out in the issue.
  - Mitigation: prove the supported surface first and keep any implementation bounded and test-backed.
- Risk: a shipped dist helper could be mistaken for a supported installed bin.
  - Mitigation: anchor the verdict in `package.json`, launcher code, and docs rather than filename presence alone.
- Risk: Linear shared-budget cooldown delays workpad and child-stream writes.
  - Mitigation: keep local packet/workpad artifacts current and push them as soon as writes reopen.

## Approvals
- Reviewer: Docs-review child stream clean-success; parent standalone review clean-success; explicit elegance review recorded.
- Date: 2026-04-12
