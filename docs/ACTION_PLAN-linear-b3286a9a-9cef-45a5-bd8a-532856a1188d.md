# ACTION_PLAN - CO: harden run-review direct-exec symlink handling without regressing subprocess harnesses

## Added by Bootstrap 2026-04-10

## Summary
- Goal: close the `run-review` direct-exec symlink follow-up with a proved supported-surface verdict, focused regression coverage, and no regression to the subprocess harness.
- Scope: docs-first packet, supported-surface proof, bounded direct-exec contract codification, focused regressions, required validation/review gates, and workpad closeout.
- Assumptions:
  - the supported repo-local review path remains `npm run review`
  - the package still ships `dist/scripts/run-review.js` without exposing `run-review` as an installed bin
  - the existing subprocess regression remains the authoritative smoke test for pipe-close behavior

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `scripts/run-review.ts`, `dist/scripts/run-review.js`, `NODE_OPTIONS=--preserve-symlinks-main`, `tests/run-review.spec.ts`, `does not crash when stdout pipe closes early`
- Not done if:
  - the lane does not prove the supported-path verdict
  - the patch widens unsupported behavior or regresses the subprocess harness
  - validation omits either the direct-exec seam or the pipe-close regression
- Pre-implementation issue-quality review:
  - the issue was correctly bounded from the start: it named the exact surfaces, rejected nearby wrong interpretations, and explicitly allowed a documented "non-blocking today" verdict instead of forcing a wider runtime change

## Milestones & Sequencing
1. Completed: registered the docs-first packet for `linear-b3286a9a-9cef-45a5-bd8a-532856a1188d`, updated `tasks/index.json`, prepended the `docs/TASKS.md` snapshot, updated `docs/docs-freshness-registry.json`, mirrored the checklist under `.agent/task/`, switched the detached workspace onto the issue branch, and created the single persistent `## Codex Workpad` comment.
2. Completed: proved the supported `run-review` entrypoint posture from `package.json`, current source/tests, and docs. Verdict: no supported symlink-preserved `run-review` entrypoint exists today; repo-local and packaged review both use direct source/dist paths.
3. Completed: kept the runtime contract strict, exported `isDirectExecution(...)` from `scripts/run-review.ts`, added a concise contract comment, and added focused regression coverage in `tests/run-review.spec.ts` without touching `bin/codex-orchestrator.ts` or the pipe-close subprocess smoke.
4. Completed with truthful fallback: ran the audited `docs-review` child stream. `docs:check` passed, and `docs:freshness` failed only on unrelated repo-wide stale-doc baseline debt, so the packet records a manifest-backed manual fallback instead of treating the lane as blocked.
5. In progress: finish the PR feedback sweep by refreshing the single workpad with the supported-path proof, rerun the relevant docs validation for the doc-only follow-up, and only resume ready-review / handoff if those gates finish cleanly.

## Dependencies
- `package.json`
- `scripts/run-review.ts`
- `tests/run-review.spec.ts`
- `orchestrator/src/cli/reviewCliLaunchShell.ts`
- `orchestrator/tests/ReviewCliLaunchShell.test.ts`
- `skills/linear/SKILL.md`

## Validation
- Checks / tests:
  - completed `linear child-stream --pipeline docs-review --stream co-127-docs-review` with manifest-backed fallback note
  - completed supported-path proof capture
  - completed focused `npx vitest run --config vitest.config.core.ts orchestrator/tests/ReviewCliLaunchShell.test.ts tests/run-review.spec.ts`
  - pending full required validation floor before review handoff
  - pending standalone review followed by elegance review before any review-state transition
- Rollback plan:
  - revert the bounded `run-review` helper export/comment/test patch and preserve the docs packet verdict if any later validation shows an unintended regression

## Risks & Mitigations
- Risk: widening the direct-exec guard would recreate the timeout pressure called out in the issue.
  - Mitigation: do not widen runtime behavior; codify the existing supported contract instead.
- Risk: the lane could confuse a shipped implementation file with a supported packaged entrypoint.
  - Mitigation: anchor the verdict in `package.json`, launcher code/tests, and user-facing docs rather than filename presence alone.
- Risk: docs-review fails for unrelated repo-wide stale-doc debt.
  - Mitigation: record truthful manual fallback only when the child stream shows the new packet itself is correctly registered and unrelated baseline debt is the only blocker.
