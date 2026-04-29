---
id: 20260428-linear-67a294b8-748d-4b8d-92ae-a884b2be7d63
title: CO-415 repair current-main core validation timeout cluster
relates_to: docs/PRD-linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md
risk: high
owners:
  - Codex
last_review: 2026-04-28
---

This mirror tracks `tasks/specs/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md`.

## Summary
- Objective: Make current-main `npm run test` terminal-green again for the CO-409-blocking core validation timeout cluster.
- Scope: `vitest.config.core.ts`, its worker-cap contract tests, focused reduced-cluster evidence, full core test validation, and CO-409 unblock notes.
- Constraints: Preserve all named tests and assertions; do not change CO-409 docs freshness scope; do not use validation waivers.

## Issue-Shaping Contract
- User-request translation carried forward: Repair the current-main baseline validation failure that blocks CO-409, with exact attention to `ControlRuntime.test.ts`, `ProviderLinearChildLaneRunner.test.ts`, `Doctor.test.ts`, and `cli-command-surface.spec.ts`.
- Protected terms / exact artifact and surface names: `npm run test`; `vitest.config.core.ts`; `ControlRuntime.test.ts`; `ProviderLinearChildLaneRunner.test.ts`; `Doctor.test.ts`; `cli-command-surface.spec.ts`; current-main baseline; timeout failures; `projects authoritative budget exhaustion event text into running rows`; CO-409; docs:freshness.
- Nearby wrong interpretations to reject: CO-409 docs metadata bypass, test deletion/quarantine, timeout-only changes, docs freshness widening, or unrelated provider queue/release policy changes.
- Explicit non-goals carried forward: No CO-409 packet edits, no weakened docs gates, no validation waiver, and no unrelated release/cloud work.

## Technical Requirements
- Reproduce the reduced cluster under current provider-worker validation posture and capture the observed failure family.
- Prove the named files pass when worker pressure is reduced, without assertion changes.
- Lower the non-interactive/CI core-suite worker cap enough for subprocess-heavy files to finish reliably.
- Update the config contract test so the intended cap is locked.
- Keep uncapped interactive local runs unchanged.
- Validate with the focused config test, the reduced cluster, and full `npm run test`.

## Validation Plan
- `npx vitest run --config vitest.config.core.ts tests/vitest-progress-config.spec.ts`
- `MCP_RUNNER_TASK_ID=linear-9e002e3b-2936-49e0-8a4a-2fa2bd360306-baseline CODEX_VITEST_PROGRESS=1 npx vitest run --config vitest.config.core.ts orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/ProviderLinearChildLaneRunner.test.ts orchestrator/tests/Doctor.test.ts tests/cli-command-surface.spec.ts`
- `npm run test`
- Required repository gates before review handoff: delegation guard, spec guard dry-run, build, lint, docs checks, docs freshness, repo stewardship, diff budget, standalone review, and elegance pass.
