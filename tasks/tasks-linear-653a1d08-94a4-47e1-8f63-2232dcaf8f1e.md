# Task Checklist - linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e

- Linear Issue: `CO-134` / `653a1d08-94a4-47e1-8f63-2232dcaf8f1e`
- MCP Task ID: `linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e`
- Primary PRD: `docs/PRD-linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`
- TECH_SPEC: `tasks/specs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`, `docs/TECH_SPEC-linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`, `docs/ACTION_PLAN-linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`, `tasks/specs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`, `tasks/tasks-linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`, `.agent/task/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`.
- [x] docs-review child-stream evidence recorded for the CO-134 packet, with truthful manual fallback for the shared stale-doc baseline. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-co-134-docs-review/cli/2026-04-10T00-23-47-516Z-b5b978f9/manifest.json`, `out/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e/manual/20260410T002347Z-docs-review-fallback.md`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `out/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e/manual/workpad.md`, Linear comment `a4836ad9-dd25-4484-9f77-b68a64c51699`.

## Investigation & Implementation
- [x] Blocking validation behavior reproduced with saved manifest or log evidence. Evidence: `out/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e/manual/20260410T002600Z-focused-repro/`, `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T10-09-22-604Z-6d4aaba4/manifest.json`, and `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T10-16-11-586Z-9d059ed9/manifest.json`.
- [x] Current blocker classified as stage timeout, suite regression, review-boundary drift, or an evidence-backed combination. Evidence: current-main reruns showed an initial `docs/TASKS.md` budget overflow, then full-suite-only instability in `orchestrator/tests/CliExecRuntime.test.ts` and `tests/cli-command-surface.spec.ts`, followed by a fully green exact-tree implementation-gate on `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/manifest.json`.
- [x] Minimal owner fix or narrowed contract landed for implementation-gate validation truth. Evidence: `orchestrator/src/cli/services/execRuntime.ts`, `orchestrator/tests/CliExecRuntime.test.ts`, and `tests/cli-command-surface.spec.ts`.
- [x] Minimal owner fix or narrowed contract landed for bounded standalone-review truth. Evidence: `scripts/lib/review-command-intent-classification.ts`, `scripts/lib/review-prompt-context.ts`, `tests/review-command-intent-classification.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`, and `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/review/telemetry.json`.
- [x] Diff stays bounded to the classified owner surfaces plus required docs and evidence paths. Evidence: `out/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e/manual/20260410T1136Z-handoff-logs/diff-budget.log`.

## Validation
- [x] Focused reproduction captured for `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`. Evidence: `out/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e/manual/20260410T002600Z-focused-repro/provider-linear-worker-runner.log`.
- [x] Focused reproduction captured for `tests/cli-frontend-test.spec.ts`, or the older failure is explicitly recorded as stale or non-owner evidence on current `HEAD`. Evidence: `out/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e/manual/20260410T002600Z-focused-repro/cli-frontend-test.log`.
- [x] Manifest-backed `implementation-gate` evidence rerun and classified truthfully. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/manifest.json`.
- [x] Forced standalone review rerun captured with explicit telemetry outcome. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/review/telemetry.json` (`status: succeeded`, `review_outcome: bounded-success`, `termination_boundary.kind: relevant-reinspection-dwell`).
- [x] `node scripts/delegation-guard.mjs`. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/commands/01-delegation-guard.ndjson`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/commands/02-spec-guard.ndjson`.
- [x] `npm run build`. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/commands/03-build.ndjson`.
- [x] `npm run lint`. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/commands/04-lint.ndjson`.
- [x] `npm run test`. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/commands/05-test.ndjson`.
- [x] `npm run docs:check`. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/commands/06-docs-check.ndjson`.
- [x] `npm run docs:freshness`. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/commands/07-docs-freshness.ndjson`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e/manual/20260410T1136Z-handoff-logs/diff-budget.log` (`files=12/25`, `lines=533/1200`).
- [x] Standalone review or truthful manual fallback recorded. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/review/telemetry.json`.
- [x] Explicit elegance pass recorded. Evidence: `out/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e/manual/workpad.md`.
- [x] `npm run pack:smoke` if the final diff still touches downstream-facing CLI or review-wrapper surfaces. Evidence: `out/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e/manual/20260410T1136Z-handoff-logs/pack-smoke.log`.

## Handoff
- [ ] PR attached to the issue.
- [x] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
- [x] Repo-wide `docs:freshness` baseline no longer blocks CO-134 on current `origin/main`. Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-implementation-gate/cli/2026-04-10T11-03-54-431Z-55ff03c2/commands/07-docs-freshness.ndjson`.
