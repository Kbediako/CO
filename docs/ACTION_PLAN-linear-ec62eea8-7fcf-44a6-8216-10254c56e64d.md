# ACTION_PLAN - CO: terminate hanging run-review mock children after timeout

## Added by Bootstrap 2026-04-16

## Summary
- Goal: prove and fix the `run-review` hanging mock cleanup path so `RUN_REVIEW_MODE=hang` does not leave orphaned PPID=1 `codex-mock.sh` / `run-review-*` processes.
- Scope: docs-first packet, bounded reproduction or obsolete-path proof, focused review-wrapper regression, narrow cleanup fix, and process-health evidence.
- Assumptions:
  - the issue is about review-wrapper test/mock children, not live provider admission
  - the cleanup boundary can identify children owned by the `run-review` temp harness
  - real user review processes must remain visible and untouched

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `run-review`, `codex-mock.sh`, `RUN_REVIEW_MODE=hang`, orphaned PPID=1 process, review drain/process-health scan
- Not done if:
  - the lane only manually kills current host orphans
  - the fix hides leaked processes from status output
  - real review processes can be killed by the cleanup path
  - no regression proves hanging review mocks are terminated/reaped
- Pre-implementation issue-quality review:
  - 2026-04-16: docs packet preserves the issue as a bounded review-wrapper mock cleanup lane and explicitly rejects live provider-admission, Linear polling, and unrelated CO behavior changes.

## Milestones & Sequencing
1. Create the docs-first packet, task checklist, registry entry, docs task snapshot, and docs freshness mirrors.
2. Reproduce the `RUN_REVIEW_MODE=hang` leak, or document why the current path is obsolete.
3. Identify the smallest cleanup/reap seam owned by the `run-review` temp harness.
4. Add or update focused `run-review` regression coverage for hanging mock timeout cleanup and real-process safety.
5. Implement the bounded cleanup fix without provider/Linear scope changes.
6. Run the focused review-wrapper/run-review test lane and passive process-health scan.
7. Record exact commands and evidence paths in the checklist before parent-owned review/PR flow.

## Dependencies
- `scripts/run-review.ts`
- existing review launch / child-process cleanup helpers, if already present
- `tests/run-review.spec.ts`
- review mock fixture behavior around `RUN_REVIEW_MODE=hang` and `codex-mock.sh`
- passive process inspection via `ps`

## Validation
- Checks / tests:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - focused review-wrapper/run-review regression for `RUN_REVIEW_MODE=hang`
  - focused safety assertion that real review processes outside the temp harness are not terminated
  - passive `ps` scan for orphaned PPID=1 `run-review-*` / `codex-mock.sh` review processes
- Rollback plan:
  - revert runtime/test changes together if cleanup ownership is too broad or real review processes become targetable
  - keep docs packet only if it remains accurate to the narrower issue scope

## Risks & Mitigations
- Risk: cleanup might overmatch and kill real review processes.
  - Mitigation: key cleanup to temp harness ownership and add focused safety coverage.
- Risk: a status/reporting change could mask the leak.
  - Mitigation: require passive process-health evidence and do not count filtering as cleanup.
- Risk: implementation drifts into provider admission or Linear polling.
  - Mitigation: keep those surfaces explicit non-goals unless shared cleanup path proof is captured first.

## Approvals
- Docs-first packet: completed by same-issue docs child lane `.runs/linear-ec62eea8-7fcf-44a6-8216-10254c56e64d-docs-packet/cli/2026-04-16T10-20-19-149Z-7914bf20/manifest.json`.
- Standalone review: completed by forced non-interactive `npm run review -- --uncommitted --title "CO-205 review mock cleanup"`; telemetry recorded `status=succeeded`, `review_outcome=bounded-success`, and `termination_boundary.kind=command-intent`.
- Elegance pass: completed with no simplification needed; the final implementation remains test-only and exact sandbox mock path scoped.
