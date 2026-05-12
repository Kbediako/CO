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
- Large refactor: bounded shared manifest helper is sufficient; no broad manifest schema redesign or lifecycle authority redesign is needed.
- Minor seam: stale whole-manifest overwrite is removed for goal evidence and known racing writers; the retained Linear-first authority contract is durable governance, not temporary compatibility debt.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker `goal_evidence` patch | stale whole-manifest overwrite after reread-before-write | remove fallback | CO-514 | concurrent goal evidence patch and unrelated writer | 2026-05-12 | 2026-05-12 | this issue | field-level patch runs under shared manifest lock | focused concurrency test |
| Whole manifest persistence | command-runner/control-host snapshot writes can race outside the patch path | remove fallback | CO-514 | snapshot persistence races with provider-worker patch | 2026-05-12 | 2026-05-12 | this issue | snapshot writes use shared helper or are proven non-overlapping | focused writer test |
| Linear-first lifecycle authority | goal evidence is advisory beside canonical workflow truth | justify retaining fallback | provider-worker workflow | goal evidence exists or fails closed | existing authority contract predates CO-514 | 2026-05-12 | non-expiring authority contract | separate approved authority redesign | advisory marker tests |

- Contract name: Linear-first advisory goal evidence authority boundary.
- Owning surface: CO provider-worker workflow and Linear/workpad/PR/review/check lifecycle gates.
- Steady-state proof: goal evidence can be present, absent, stale, or malformed while lifecycle authority remains with Linear/workpad/PR/review/check gates.
- Tests/docs: manifest helper tests, command-runner/provider-worker goal evidence tests, and CO-514 packet docs prove advisory markers and authority denial remain intact.
- Non-expiring rationale: the authority boundary is a supported governance contract and should be removed only by a separate approved lifecycle authority redesign.

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
