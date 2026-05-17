# PRD - CO: terminate hanging run-review mock children after timeout

## Traceability
- Linear issue: `CO-205` / `ec62eea8-7fcf-44a6-8216-10254c56e64d`
- Task id: `linear-ec62eea8-7fcf-44a6-8216-10254c56e64d`
- Canonical spec: `tasks/specs/linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`
- Docs packet child lane: `.runs/linear-ec62eea8-7fcf-44a6-8216-10254c56e64d-docs-packet/cli/2026-04-16T10-20-19-149Z-7914bf20/manifest.json`
- Source anchor: `ctx:sha256:3b4ea97b5bcc16b71fdd2942cb023f0d4031067c77a83fb0c0c36ff65ba5d8c4#chunk:c000001`

## Summary
`CO-205` fixes a review-wrapper cleanup gap where a hanging `run-review` mock can survive timeout handling as an orphaned PPID=1 process. The desired outcome is a bounded reproduction or obsolete-path proof, a regression for `RUN_REVIEW_MODE=hang`, and a cleanup path that terminates/reaps only test/mock children owned by the `run-review` temp harness while leaving real user review processes visible and untouched.

## User Request Translation
- Investigate and fix leaked `run-review` mock process cleanup, specifically `codex-mock.sh` processes created by the review wrapper test harness.
- Preserve the exact issue surface: `run-review`, `codex-mock.sh`, `RUN_REVIEW_MODE=hang`, orphaned PPID=1 process, and review drain/process-health scan.
- Treat this as a review-wrapper test/mock cleanup issue, not a live provider-admission bug.
- Record evidence before moving out of analysis: reproduction or obsolete-path proof, focused regression coverage, relevant review-wrapper/run-review test lane, and a passive process-health check.

## Intent Checksum
- Protected terms and surfaces: `run-review`, `codex-mock.sh`, `RUN_REVIEW_MODE=hang`, orphaned PPID=1 process, review drain/process-health scan, `run-review-*`, `tests/run-review.spec.ts`, and review wrapper temp harness.
- Nearby wrong interpretations to reject: do not classify this as a live provider-admission bug, do not manually kill observed orphans as the fix, do not hide leaked processes from status output, and do not broaden into provider admission, Linear polling, `CO-189`, `CO-203`, or `CO-204` behavior unless reproduction proves the same cleanup path is shared.

## Parity / Alignment Matrix

| Surface | Current / Reference Truth | Target Truth |
| --- | --- | --- |
| Hanging review mock | `RUN_REVIEW_MODE=hang` can leave `codex-mock.sh` or `run-review-*` harness children alive after timeout if cleanup misses descendants. | Timeout handling terminates and reaps the mock child tree owned by the temp harness. |
| Real review processes | Real user review processes may legitimately be active and visible in status/process scans. | Cleanup does not target, hide, or relabel real review processes. |
| Process-health evidence | Passive checks can reveal orphaned PPID=1 review mock processes after tests. | Post-test process-health scan shows no new orphaned `run-review-*` / `codex-mock.sh` review mock processes from the lane. |
| Provider/Linear flows | Provider admission, Linear polling, and related CO issue behavior are separate unless the same cleanup path is proven shared. | The lane stays on review-wrapper cleanup and documents any shared-path proof before widening scope. |

## Acceptance Criteria
- Freshly reproduce the leak, or show with current code/process evidence that the reported path is obsolete.
- Add or update a bounded regression for `run-review` mock timeout/cleanup using `RUN_REVIEW_MODE=hang`.
- Cleanup targets only test/mock children owned by the `run-review` temp harness, not real user review processes.
- Re-run the relevant review-wrapper/run-review test lane.
- Run a passive `ps` review drain/process-health scan showing no new orphaned `run-review-*` / `codex-mock.sh` review processes.
- Capture evidence paths and exact commands in the task checklist before moving out of analysis.

## Non-Goals
- No manual host cleanup as the implementation.
- No provider admission, Linear polling, `CO-189`, `CO-203`, or `CO-204` behavior changes unless reproduction proves a shared cleanup path.
- No status-output masking that hides leaked processes instead of terminating/reaping the harness-owned mock tree.
- No broad review-wrapper rewrite or unrelated process supervisor redesign.

## Not Done If
- The fix only kills the current host's observed orphans manually.
- The fix hides or filters leaked processes from status output instead of proving termination/reaping.
- Hanging review mocks can still survive as orphaned PPID=1 `run-review-*` / `codex-mock.sh` processes.
- Real user review processes can be terminated by the cleanup path.
- The checklist lacks reproduction or obsolete-path proof, regression evidence, focused test evidence, and passive process-health scan output.

## Validation Contract
- Add a focused regression around `RUN_REVIEW_MODE=hang` in the review-wrapper test surface.
- Run the relevant `run-review` focused test lane, not the full repo suite, during the implementation slice.
- Run a passive process-health command that identifies whether `run-review-*` / `codex-mock.sh` review processes remain orphaned.
- Keep all evidence in the task checklist for parent-owned integration and review.
