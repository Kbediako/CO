# ACTION_PLAN - CO-514 Serialize Provider-Worker Goal Evidence Manifest Patches

## Summary
- Goal: prevent provider-worker advisory `goal_evidence` manifest patches from overwriting concurrent unrelated manifest fields.
- Scope: docs packet, shared manifest patch/write helper, provider-worker and command-runner call sites, focused concurrency tests, validation/review handoff.
- Assumptions: run manifests remain JSON objects; `goal_evidence` remains advisory-only; no schema migration is required.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: provider-worker manifest patch, `goal_evidence`, manifest-level serialization, field-level merge, compare/retry, command-runner manifest persistence, control-host manifest persistence, `advisory_only`.
- Not done if: `goal_evidence` patches can overwrite concurrent unrelated fields, only one racing call site is serialized, stale or malformed evidence is promoted, or lifecycle decisions use goal state.
- Pre-implementation issue-quality review: issue is implementation-ready and narrowly scoped to manifest persistence serialization/merge, not lifecycle authority or schema redesign.
- Fallback / refactor decision: this task removes the stale whole-manifest overwrite seam for `goal_evidence` patching and whole-snapshot racing writers; it retains the durable Linear-first advisory-authority contract.
- Durable retention evidence: Linear/workpad/PR/review/check authority is retained as a non-expiring governing contract with advisory marker tests and denial markers.
- Large-refactor check: no large refactor; the bounded shared helper addresses the actual race without redesigning manifest schema ownership.

## Milestones & Sequencing
1. Create the CO-514 docs-first packet and registry mirrors.
2. Add the shared manifest patch/write helper with lock, current-read, merge, and atomic write behavior.
3. Route provider-worker `goal_evidence`, provider-worker runtime/backfill, and command-runner manifest persistence through the shared contract.
4. Add focused concurrency tests and advisory marker regression coverage.
5. Run validation, standalone review, elegance review, PR handoff, and ready-review drain.

## Dependencies
- Existing lock helper: `orchestrator/src/persistence/lockFile.ts`.
- Existing atomic JSON writer: `orchestrator/src/cli/utils/fs.ts`.
- Provider-worker goal evidence normalization from CO-492.
- Current run manifest path and workpad remain advisory evidence only.

## Validation
- Checks / tests:
  - targeted manifest helper/provider-worker concurrency tests
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review
  - explicit elegance/minimality pass
- Rollback plan: revert the helper and call-site changes; manifests remain backward-compatible JSON objects.

## Risks & Mitigations
- Risk: whole-snapshot merging preserves a field a caller intended to delete by omission. Mitigation: only explicit outgoing fields are authoritative; callers that need clearing must set `null`.
- Risk: lock contention stalls persistence. Mitigation: bounded lock retry and stale diagnostics from the existing lock helper.
- Risk: authority boundary drift. Mitigation: keep `goal_evidence` validation and not-authorized-for marker generation unchanged.

## Approvals
- Reviewer: provider worker parent
- Date: 2026-05-12

