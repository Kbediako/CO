# Task Checklist - linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c

- Linear Issue: `CO-96` / `99d7fc30-93ab-43fd-94c2-68d604b4f85c`
- MCP Task ID: `linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c`
- Primary PRD: `docs/PRD-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`
- TECH_SPEC: `tasks/specs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the persisted workpad source were drafted for `CO-96`. Evidence: `docs/PRD-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`, `docs/TECH_SPEC-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`, `docs/ACTION_PLAN-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`, `tasks/specs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`, `tasks/tasks-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`, `.agent/task/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`.
- [x] Docs-review delegation evidence is captured and packet-only fixes were folded back before implementation. Evidence: `.runs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c-docs-review/cli/2026-04-09T08-48-16-376Z-e9616108/manifest.json`, `.runs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c-docs-review/cli/2026-04-09T08-48-16-376Z-e9616108/review/telemetry.json`, `out/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c/TASKS-archive-2026.md`.

## Implementation
- [x] Additive manifest memory observability contract exists with selected-memory provenance plus rejected, rediscovered, and manual-repair decisions. Evidence: `schemas/manifest.json`, `packages/shared/manifest/types.ts`, `orchestrator/src/cli/run/source0.ts`, `orchestrator/src/cli/run/manifest.ts`, `orchestrator/tests/Manifest.test.ts`.
- [x] `run:summary` emits the bounded memory observability payload. Evidence: `packages/shared/events/types.ts`, `orchestrator/src/cli/exec/summary.ts`, `orchestrator/tests/ExecSummary.test.ts`.
- [x] `metrics.json` mirrors contradiction, rediscovery, resume-latency, manual-repair, repeated-failure, retrieval hit/miss, and selected-memory provenance summary fields. Evidence: `orchestrator/src/cli/metrics/metricsRecorder.ts`, `orchestrator/src/cli/metrics/metricsAggregator.ts`, `orchestrator/tests/MetricsRecorderMemory.test.ts`.
- [x] The implementation stays bounded to memory-specific run artifacts and does not widen into general provider-worker telemetry. Evidence: `docs/PRD-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`, `tasks/specs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`, `orchestrator/src/cli/run/source0.ts`, `orchestrator/src/cli/exec/summary.ts`, `orchestrator/src/cli/metrics/metricsRecorder.ts`.

## Validation
- [x] Focused tests cover manifest emission, inherited-context integrity, and absence behavior for the memory observability contract. Evidence: `npm run test:orchestrator -- orchestrator/tests/RlmContextStoreOffsets.test.ts orchestrator/tests/Manifest.test.ts orchestrator/tests/ExecSummary.test.ts orchestrator/tests/MetricsRecorderMemory.test.ts` (`25` tests passed), `orchestrator/tests/Manifest.test.ts`, `orchestrator/tests/RlmContextStoreOffsets.test.ts`.
- [x] Focused tests cover summary-event emission and absence behavior for memory observability. Evidence: `npm run test:orchestrator -- orchestrator/tests/RlmContextStoreOffsets.test.ts orchestrator/tests/Manifest.test.ts orchestrator/tests/ExecSummary.test.ts orchestrator/tests/MetricsRecorderMemory.test.ts` (`25` tests passed), `orchestrator/tests/ExecSummary.test.ts`, `orchestrator/tests/ExecCommand.test.ts`.
- [x] Focused tests cover metrics emission and absence behavior for memory observability. Evidence: `npm run test:orchestrator -- orchestrator/tests/RlmContextStoreOffsets.test.ts orchestrator/tests/Manifest.test.ts orchestrator/tests/ExecSummary.test.ts orchestrator/tests/MetricsRecorderMemory.test.ts` (`25` tests passed), `npx vitest run --config vitest.config.core.ts orchestrator/tests/ExecCommand.test.ts orchestrator/tests/MetricsAggregator.test.ts orchestrator/tests/MetricsRecorderPrivacy.test.ts` (`22` tests passed), `orchestrator/tests/MetricsRecorderMemory.test.ts`.
- [x] `MCP_RUNNER_TASK_ID=linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (2 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c node scripts/spec-guard.mjs --dry-run`. Evidence: `✅ Spec guard: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c npm run build`. Evidence: passed before implementation closeout and again after the inherited-index integrity fix.
- [x] `MCP_RUNNER_TASK_ID=linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c npm run lint`. Evidence: passed before implementation closeout and again after the inherited-index integrity fix.
- [x] `MCP_RUNNER_TASK_ID=linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c npm run docs:check`. Evidence: `✅ docs:check: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c npm run docs:freshness`. Evidence: `docs:freshness OK - 3446 docs, 3449 registry entries`.
- [x] `DIFF_BUDGET_OVERRIDE_REASON='CO-96 requires docs-first packet plus additive manifest/events/metrics schema and focused tests in one issue-scoped slice' MCP_RUNNER_TASK_ID=linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c node scripts/diff-budget.mjs`. Evidence: override applied and accepted on the current working tree (`1827` lines > `1200`).
- [x] `MCP_RUNNER_TASK_ID=linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c FORCE_CODEX_REVIEW=1 npm run review`. Evidence: wrapper reran cleanly with `status: succeeded`, `review_outcome: clean-success`, and `termination_boundary: null` in `../../.runs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c/cli/2026-04-11T23-10-47-968Z-39ee762d/review/telemetry.json`.
- [x] Explicit elegance/minimality pass recorded after standalone review findings were addressed. Evidence: the final fix keeps integrity validation in `orchestrator/src/cli/rlm/context.ts` so every `dir`-sourced context object is protected; no duplicate source-0-only validation path was added.
- [x] `MCP_RUNNER_TASK_ID=linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c npm run pack:smoke`. Evidence: `✅ pack smoke passed`.
- [x] `MCP_RUNNER_TASK_ID=linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c npm run test`. Evidence: reran cleanly after the post-PR `origin/main` merge repair; `332` files passed and `3618` tests passed.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is current on the Linear issue. Evidence: Linear workpad comment `f7bced50-0879-4c68-a8e7-e4840c3143c8`, `out/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c/manual/workpad.md`.
- [x] PR attached to the issue before review-state handoff. Evidence: PR `#449` / `https://github.com/Kbediako/CO/pull/449`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: merged `origin/main` `f3d45a494a0422cbb18b746b33a755c736f6c9e8` into branch commit `dcfe06b4d40b1c554c78a0907d2a8b278938207a`.
- [ ] PR checks green, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
