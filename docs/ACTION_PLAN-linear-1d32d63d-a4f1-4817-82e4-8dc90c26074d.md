# ACTION_PLAN - CO-503 May 6 active spec-guard stale review baseline

## Summary
- Goal: refresh or reclassify the exact May 6 stale active specs so `spec-guard` passes on current main without weakening the guard.
- Scope: docs-first packet, exact stale specs, task/index/registry mirrors, validation, review, PR, and Linear handoff.
- Assumptions: `f7a34fe4b7` is the current clean-main baseline for this worker turn, and PR `#779` / `CO-455` is only triggering evidence.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `spec-guard`, `active specs`, `last_review=2026-04-05`, `Core Lane`, PR `#779`, `CO-455`, stale active specs, `spec-guard:active-specs:last_review=2026-04-05`.
- Not done if: the May 6 stale set still fails `spec-guard`, touched specs lack evidence, terminal owners remain the only capacity, or the fix changes `CO-455` implementation/test behavior.
- Pre-implementation issue-quality review: complete. The issue has exact artifacts, non-goals, parity matrix, and false-done criteria; it requires a governed docs/spec metadata repair, not a micro-task.
- Fallback / refactor decision: this is stale metadata cleanup. The decision is `expire fallback` for completed-lane historical specs left active past cadence; no code fallback is added or retained.
- Durable retention evidence: historical packet files remain on disk; only source spec status and registry status/cadence change when live Linear state proves the source issue is terminal.
- Large-refactor check: not applicable because there is no split code authority or new behavior seam.

## Milestones & Sequencing
1. Reproduce `spec-guard` and docs freshness stale baselines before edits.
2. Launch and resolve same-issue child lane evidence for a bounded docs slice.
3. Create/register the CO-503 packet and update the workpad.
4. Live-verify six Linear source issues and classify source specs.
5. Edit metadata only: source spec statuses/notes, active RLM review note, task index approvals, docs freshness registry rows, and docs/TASKS snapshot.
6. Run validation gates and standalone/elegance review.
7. Open/attach PR, drain `ready-review`, then transition to `In Review` only if clean.

## Dependencies
- Live Linear issue reads for `CO-80`, `CO-82`, `CO-83`, `CO-84`, `CO-85`, and `CO-98`.
- Child lane manifest `.runs/linear-1d32d63d-a4f1-4817-82e4-8dc90c26074d-stale-spec-review-secondary/cli/2026-05-06T00-16-37-661Z-39e92226/manifest.json`.
- Current repo validation tools.

## Validation
- Checks / tests:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:freshness`
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `node scripts/delegation-guard.mjs`
  - `npm run docs:check`
  - required build/lint/test floor as appropriate before handoff
  - manifest-backed `npm run review` under `FORCE_CODEX_REVIEW=1`
  - explicit elegance review
- Rollback plan: revert the metadata-only patch and restore the previous registry/index rows; no product code or guard behavior changes are involved.

## Risks & Mitigations
- Risk: blindly refreshing dates hides stale ownership.
  - Mitigation: each terminal source spec gets live Linear state and PR evidence in review notes and task index approvals.
- Risk: docs freshness remains red after spec reclassification.
  - Mitigation: archive only matching completed-lane packet/mirror registry rows with 365-day cadence.
- Risk: child lane patch contradicts live evidence.
  - Mitigation: reject child patch and record the live-evidence supersession in the workpad and task notes.

## Approvals
- Reviewer: Codex provider worker pre-implementation issue-quality review.
- Date: 2026-05-06

