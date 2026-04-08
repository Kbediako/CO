# ACTION_PLAN - CO workflow: stop repo-wide docs baseline regressions from forcing manual fallback in unrelated lanes

## Traceability
- Linear issue: `CO-102` / `f0d312eb-055f-4926-80df-8fcaaf56839c`
- Prior attempt: PR `#370` fixed the April 6 stale cohort and merged cleanly, but the issue reopened after the shared baseline relapsed under a different seam

## Summary
- Goal: restore a truthful green shared docs baseline and stop unrelated lanes from accepting manual fallback purely because completed implementation packets are not leaving the active baseline.
- Scope: refresh the reopened docs-first packet, capture the current failure shape, run an audited docs-review child stream, patch the narrow archive-eligibility seam, reconcile any residual stale active docs, rerun the required validation floor, and prepare review handoff.
- Assumptions:
  - the primary prevention fix is a bounded archive-selection update plus truthful residual-doc reconciliation, not a review-policy change

## Execution Update 2026-04-09
- Current baseline is narrower than the April 6 stale-spec repair:
  - `node scripts/spec-guard.mjs --dry-run`: `OK`
  - `npm run docs:check`: `OK`
  - `npm run docs:freshness`: `FAILED` with `282` stale docs (`Task Packet=205`, `Task Mirror=41`, `Report Only=36`)
- The archive scheduler is not dead:
  - GitHub Actions `Implementation Docs Archive Automation` succeeded on `2026-04-08T04:21:46Z`
  - local `node scripts/implementation-docs-archive.mjs --dry-run` also reported `Archived docs: 0`, `Skipped docs: 313`, `Stray candidates: 146`
- Root cause is concrete:
  - `scripts/implementation-docs-archive.mjs` only archives task-linked docs when `tasks/index.json` has `status === "succeeded"` plus `completed_at`
  - current completed run items use `status: "completed"` with `completed_at` and `gate.status: "succeeded"`
  - completed March packets therefore never become archive candidates, so the stale baseline returns while the automation still looks healthy

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:check`
  - `docs:freshness`
  - `docs/TASKS.md`
  - `manual fallback`
  - `implementation-docs-archive`
- Not done if:
  - the archive workflow still produces zero task-linked candidates while completed packets remain stale and active
  - `docs:freshness` is still red after the prevention fix and truthful residual reconciliation
  - the lane succeeds only by weakening docs or review policy
- Pre-implementation issue-quality review:
  - the reopened issue is explicitly about shared docs-baseline recurrence, so the implementation should stay on archive eligibility, truthful stale-doc reconciliation, and packet/workpad evidence rather than drifting into review-wrapper redesign

## Milestones & Sequencing
1. Refresh the `CO-102` docs-first packet, registry dates, `docs/TASKS.md`, and the single Linear workpad so the reopened scope is truthful.
2. Run an audited `docs-review` child stream on the refreshed packet before code edits.
3. Patch `scripts/implementation-docs-archive.mjs` so completed task items using the current `tasks/index.json` vocabulary become eligible for archival under the existing policy.
4. Add focused regression coverage in `tests/implementation-docs-archive.spec.ts` for the current completion vocabulary and any linked-doc archive behavior touched by the fix.
5. Rerun archive discovery (`--dry-run`) and, if needed, execute the bounded archive or active-doc reconciliation steps required to clear `docs:freshness`.
6. Rerun the required validation floor, then complete standalone review and an explicit elegance/minimality pass before PR handoff.

## Dependencies
- Current workspace branch `linear/co-102-docs-baseline-regression-prevention`
- packaged `linear` helper surface for issue/workpad/state continuity
- `scripts/docs-freshness.mjs`
- `scripts/implementation-docs-archive.mjs`
- `docs/implementation-docs-archive-policy.json`
- `docs/docs-freshness-registry.json`
- `tasks/index.json`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --stream co-102-docs-review-r2 --format json`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/implementation-docs-archive.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run build`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run test`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c FORCE_CODEX_REVIEW=1 npm run review`
- Rollback plan:
  - revert the bounded archive-eligibility fix if it archives docs that are still meant to stay active
  - prefer explicit residual active-doc review or a tightly-scoped follow-up over silent status churn

## Risks & Mitigations
- Risk: the archive fix clears most of the stale set but leaves a smaller truly-active stale cohort.
  - Mitigation: rerun `docs:freshness`, inspect the residual list, and only refresh or split follow-up work where the remaining docs are genuinely active.
- Risk: the archiver fix over-matches task records and archives docs from still-live lanes.
  - Mitigation: keep the eligibility update narrowly keyed to `completed_at` plus the current completion vocabulary, and add focused regression tests.
- Risk: the docs packet drifts again while implementation proceeds.
  - Mitigation: refresh the workpad and packet after the docs-review stream, after the archive fix, and before handoff.

## Approvals
- Reviewer: pending
- Date: 2026-04-09
