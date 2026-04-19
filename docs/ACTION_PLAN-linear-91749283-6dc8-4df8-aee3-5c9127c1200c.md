# ACTION_PLAN - Doctor validation: classify and restore current Doctor readiness stability for CO-220 handoff

## Summary
- Goal: preserve the exact `Doctor.test` comparison buckets for `CO-231`, land the smallest truthful Doctor fix, and carry the issue to a review-ready state without reopening `CO-220`.
- Scope: current-head Doctor classification, the narrow direct-dist fixture repair in `orchestrator/tests/Doctor.test.ts`, the docs/spec packet, and the remaining repo gates and review evidence.
- Assumptions: the issue prompt and source anchor are authoritative for the preserved clean-main and `CO-220` comparison buckets; current-head validation results in this workspace are the authoritative post-fix target-head truth.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `Doctor.test`
  - `full-suite`
  - `isolated rerun`
  - `provider readiness`
  - `direct-dist delegation readiness and initialize latency`
  - `keeps Telegram incomplete when transport is allowed but mutations are disabled`
  - `falls back to legacy collab feature key when canonical key is absent`
  - `current branch`
  - `origin/main`
  - `CO-220`
- Not done if:
  - the current target head still fails `Doctor.test` in isolated or full-suite validation
  - the clean-main and `CO-220` buckets are no longer explicitly separable
  - the lane claims to fix `CO-220` stale-attachment logic
  - the Doctor surface is kept green only by hiding failures or weakening truth
- Pre-implementation issue-quality review:
  - 2026-04-18: retrospective issue-quality review confirms `CO-231` is the correct narrow lane. The preserved clean-main direct-dist failure plus the `CO-220` branch-only timeout cluster make this a Doctor validation stability issue, not a stale-attachment / truth-projection issue. The micro-task path is still ineligible because correctness depends on exact issue wording, exact failure buckets, and the preserved separation from `CO-220`.

## Milestones & Sequencing
1. Preserve and restate the clean-main and `CO-220` comparison buckets in machine-checkable artifacts.
2. Isolate the current-head Doctor seam and confirm the direct-dist failure is caused by a non-hermetic test assumption.
3. Replace the test's implicit workspace `dist/` dependency with a temp-repo fake delegate server fixture.
4. Re-run `npm run build`, the isolated `Doctor.test` suite, and the full `npm test` path on the current target head.
5. Backfill the docs/spec packet, registry mirrors, and workpad with the repaired current-head truth.
6. Run the remaining repo gates, standalone review, and elegance pass before any PR or review-state transition.

## Dependencies
- Linear issue `CO-231`
- Source anchor `ctx:sha256:2e68cd2fda454db25cb1007f4066d1660e095ddaaf609630cabcc4697c11670e#chunk:c000001`
- Initial worker manifest `.runs/linear-91749283-6dc8-4df8-aee3-5c9127c1200c/cli/2026-04-18T02-10-26-787Z-56ab47e0/manifest.json`
- Successful classification-note child-lane manifest `.runs/linear-91749283-6dc8-4df8-aee3-5c9127c1200c-classification-note/cli/2026-04-18T02-34-58-947Z-42530f5e/manifest.json`
- Parent-owned implementation surface:
  - `orchestrator/tests/Doctor.test.ts`
- Preserved comparison artifacts:
  - `out/linear-91749283-6dc8-4df8-aee3-5c9127c1200c/manual/20260418T023500Z-child-lane-doctor-classification.md`
  - `out/linear-91749283-6dc8-4df8-aee3-5c9127c1200c/manual/workpad-latest.md`

## Validation
- Current-head checks already completed:
  - `npm run build`
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/Doctor.test.ts`
  - `npm test`
- Remaining repo gates before handoff:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run lint`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review`
  - `npm run pack:smoke`
- Rollback plan:
  - if a remaining gate shows Doctor-specific fallout, stop and fix only that bounded seam
  - if remaining failures are unrelated to Doctor stability, record them separately instead of conflating them with `CO-231`

## Risks & Mitigations
- Risk: the lane drifts back into `CO-220` stale-attachment logic.
  - Mitigation: every mirror repeats that `CO-231` owns Doctor validation only.
- Risk: the direct-dist fix hides a real runtime problem rather than a test-fixture problem.
  - Mitigation: keep the change inside `orchestrator/tests/Doctor.test.ts` and continue to validate current-head Doctor behavior through both isolated and full-suite paths.
- Risk: the docs-first packet becomes untrustworthy because the intended docs child lanes stalled.
  - Mitigation: record the stalled/drifted child-lane history explicitly and treat only the successful `classification-note` lane as advisory evidence; keep the parent-authored packet authoritative.

## Approvals
- Parent packet / implementation lane: provider worker in the authoritative workspace.
- Standalone review: manifest-backed rerun completed as `review_outcome=bounded-success` with no actionable diff-local findings after the stale checklist fix.
- Elegance review: `out/linear-91749283-6dc8-4df8-aee3-5c9127c1200c/manual/20260419-elegance-review.md`.
- PR handoff: pending PR create/attach and `pr ready-review` drain.
