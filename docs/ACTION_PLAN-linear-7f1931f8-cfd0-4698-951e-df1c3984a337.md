# ACTION_PLAN - CO STATUS: bound provider proof session-log refresh cost

## Summary
- Goal: bound repeated provider-proof session-log hydration work for active root `CO STATUS` refreshes without regressing the authoritative runtime telemetry restored in `CO-98`.
- Scope: docs-first packet, one workpad, docs-review, bounded proof-refresh implementation, focused regressions, and review gates.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `provider-linear-worker-proof.json`, `refreshProviderLinearWorkerProofSnapshot`, `selectedRunProjection`, `rollout-*.jsonl`, authoritative runtime telemetry, incremental or bounded refresh hydration, `Tokens`, `SESSION`, `Throughput`, `5-hour`, and `weekly`.
- Not done if:
  - `refreshProviderLinearWorkerProofSnapshot` still rereads the same session log from byte `0` on repeated in-progress refreshes for the same active worker
  - a long-running worker with a large `rollout-*.jsonl` file still causes repeated full-file reads during root control-host refreshes
  - the optimization drops or delays truthful runtime telemetry for `Tokens`, `SESSION`, `Throughput`, or Codex `5-hour` / `weekly`
- Pre-implementation issue-quality review: approved as one bounded proof-refresh optimization lane over the authoritative root control-host telemetry path, not a refresh-throttling or UI lane.

## Milestones & Sequencing
- [x] Register the `linear-7f1931f8-cfd0-4698-951e-df1c3984a337` docs packet, registry mirrors, `.agent` mirror, and workpad source.
- [x] Run the audited `docs-review` child stream and fold back any packet fixes before implementation. Evidence: `.runs/linear-7f1931f8-cfd0-4698-951e-df1c3984a337-co-99-docs-review-r2/cli/2026-04-05T23-12-59-925Z-cae6b004/manifest.json`, `.runs/linear-7f1931f8-cfd0-4698-951e-df1c3984a337-co-99-docs-review-r2/cli/2026-04-05T23-12-59-925Z-cae6b004/review/telemetry.json`.
- [x] Confirm the smallest safe bounded-refresh contract for a stable `rollout-*.jsonl` file and explicit reset conditions for mismatch/rotation/truncation. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `tasks/specs/linear-7f1931f8-cfd0-4698-951e-df1c3984a337.md`.
- [x] Implement the bounded session-log hydration change in the provider-proof refresh path. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] Add focused repeated-refresh regression coverage for both the growing-log steady state and fail-closed rotation/truncation reset paths, then revalidate the protected telemetry fields. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [ ] Run the required validation floor plus standalone/elegance review and refresh the workpad for PR/review handoff. Evidence: `out/linear-7f1931f8-cfd0-4698-951e-df1c3984a337/manual/workpad.md` records clean CO-99-local reruns plus the remaining repo-wide `spec-guard` / `docs:freshness` blockers and pending PR drain.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-7f1931f8-cfd0-4698-951e-df1c3984a337 node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --stream co-99-docs-review --format json`. Evidence: `.runs/linear-7f1931f8-cfd0-4698-951e-df1c3984a337-co-99-docs-review-r2/cli/2026-04-05T23-12-59-925Z-cae6b004/manifest.json`, `.runs/linear-7f1931f8-cfd0-4698-951e-df1c3984a337-co-99-docs-review-r2/cli/2026-04-05T23-12-59-925Z-cae6b004/review/telemetry.json`.
- [x] Focused repeated-refresh regressions for `refreshProviderLinearWorkerProofSnapshot` and the selected-run proof refresh path, including fail-closed coverage for rotated or truncated session logs. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [ ] Validation floor: delegation/spec guard, build, lint, test, docs:check, docs:freshness, diff-budget, standalone review, elegance pass, and `npm run pack:smoke`. Evidence: `out/linear-7f1931f8-cfd0-4698-951e-df1c3984a337/manual/workpad.md` records clean reruns for the CO-99-local checks, a documented standalone-review fallback, and the remaining repo-wide `spec-guard` / `docs:freshness` blockers.

## Risks & Mitigations
- Risk: a bounded tail cursor could carry stale state across log rotation or truncation.
  - Mitigation: tie reuse to the discovered path and fail closed to a full reread whenever the cursor is no longer trustworthy.
- Risk: the optimization accidentally hides new telemetry fields that only appear later in the session.
  - Mitigation: keep parsing authoritative and incremental over appended bytes only; add repeated-refresh growing-log tests that prove late fields still appear.
- Risk: proof-side state grows into unrelated schema churn.
  - Mitigation: keep the persisted hydration state opaque, minimal, and local to the proof refresh contract.

## Approvals
- Reviewer: `codex-orchestrator docs-review`
- Date: 2026-04-06
- Manifest: `.runs/linear-7f1931f8-cfd0-4698-951e-df1c3984a337-co-99-docs-review-r2/cli/2026-04-05T23-12-59-925Z-cae6b004/manifest.json`
