# PRD: CO-415 repair current-main core validation timeout cluster

## Added by Provider Worker 2026-04-28

## Summary
- Problem Statement: Current-main core validation can fail in provider-worker or CI-style non-interactive runs when subprocess-heavy Vitest files run with too much parallelism, blocking CO-409 review handoff even though the CO-409 docs freshness scope is clean.
- Desired Outcome: `npm run test` becomes terminal-green again on current main without deleting tests, weakening assertions, bypassing `vitest.config.core.ts`, or changing CO-409 docs freshness metadata.

## User Request Translation
- User intent / needs: Repair the current-main validation blocker reproduced from CO-409 evidence, keep the work bounded to the named core test timeout cluster, and record clear downstream unblock guidance for CO-409.
- Success criteria / acceptance: Reproduce the reduced cluster or a fresher equivalent, identify the concrete shared cause, land the smallest non-masking fix, run the full core test suite, and document how CO-409 should rerun validation.
- Constraints / non-goals: Do not weaken `npm run test`, `docs:check`, `docs:freshness`, provider-worker review gates, or CO-409 docs packet/registry work.

## Intent Checksum
- Protected terms / exact artifact and surface names: `npm run test`; `vitest.config.core.ts`; `ControlRuntime.test.ts`; `ProviderLinearChildLaneRunner.test.ts`; `Doctor.test.ts`; `cli-command-surface.spec.ts`; current-main baseline; timeout failures; `projects authoritative budget exhaustion event text into running rows`; CO-409; docs:freshness.
- Nearby wrong interpretations to reject: Bypassing validation by changing CO-409 docs freshness metadata; deleting or quarantining the named tests; raising timeouts without identifying the shared pressure point; treating docs-only CO-409 files as the cause after clean current-main reproduction; folding March 28 docs freshness maintenance into this lane.

## Not Done If
- `npm run test` still fails on current main for the named timeout/assertion family.
- Only focused tests pass while the full core suite remains red for the same cluster.
- The fix hides failures by deleting tests, loosening assertions, or disabling the provider-worker validation surface.
- CO-409 still cannot rerun its required validation floor and proceed to standalone review without a waiver.

## Goals
- Reproduce the reduced four-file cluster under provider-worker validation posture.
- Isolate whether the shared cause is concurrency pressure, subprocess cleanup, command-surface completion, control-runtime projection logic, or another concrete cause.
- Adjust the core test runner posture so subprocess-heavy files finish under non-interactive validation without masking failures.
- Preserve interactive local test behavior where no CI/provider-worker cap is requested.
- Record CO-409 unblock guidance after validation is green.

## Non-Goals
- Do not modify CO-409 docs freshness packet or registry work except for ordinary rebasing after this repair lands.
- Do not weaken `docs:freshness`, `docs:check`, or provider-worker review gates.
- Do not use a blanket validation waiver as the fix.
- Do not broaden into unrelated release, cloud, or provider-worker queue policy unless tests prove that exact shared root cause.

## Technical Considerations
- Initial evidence shows `--maxWorkers=4` allows the named subprocess-heavy files to overlap enough to produce per-test timeouts and Vitest worker RPC timeouts.
- A serial or lower-concurrency reduced run passes without changing assertions, which points at worker-cap posture rather than product projection logic.
- The likely narrow surface is `vitest.config.core.ts` plus `tests/vitest-progress-config.spec.ts`.
- The fix should stay deterministic for `CI`, `CODEX_VITEST_PROGRESS`, `CODEX_NON_INTERACTIVE`, `CODEX_NONINTERACTIVE`, and `CODEX_NO_INTERACTIVE`.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? No.
- Decision: No fallback is introduced. This is a core validation runner-cap correction for non-interactive lanes.
- Large-refactor check: A broad test harness refactor is not required; the existing worker-cap seam is sufficient if focused and full validation pass.
