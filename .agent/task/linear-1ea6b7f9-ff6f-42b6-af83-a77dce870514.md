# Task Checklist - linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514

- MCP Task ID: `linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514`
- Primary PRD: `docs/PRD-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`
- TECH_SPEC: `tasks/specs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`

## Docs-first
- [x] PRD drafted for the `CO-16` review-tail and truthfulness lane. Evidence: `docs/PRD-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`, `docs/TECH_SPEC-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`.
- [x] `tasks/index.json` registers the `CO-16` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `CO-16` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`. Evidence: `.agent/task/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`.
- [x] docs-review approved the `CO-16` packet for implementation. Evidence: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T08-11-34-245Z-b218e257/manifest.json`.

## Investigation
- [x] Live Linear workflow states and current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id 1ea6b7f9-ff6f-42b6-af83-a77dce870514 --format json`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id 1ea6b7f9-ff6f-42b6-af83-a77dce870514 --state "In Progress" --format json`.
- [x] Baseline audit captured the current review evidence mismatch between recent telemetry, manifest, and run-summary artifacts. Evidence: `out/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/manual/20260324T080455Z-baseline-audit.md`.
- [x] Required review-runtime, telemetry, scope-advisory, docs, config, and focused test seams were audited before implementation. Evidence: `scripts/run-review.ts`, `scripts/lib/review-execution-boundary-preflight.ts`, `scripts/lib/review-execution-runtime.ts`, `scripts/lib/review-execution-state.ts`, `scripts/lib/review-execution-telemetry.ts`, `scripts/lib/review-scope-advisory.ts`, `docs/standalone-review-guide.md`, `codex.orchestrator.json`, `tests/run-review.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/review-execution-telemetry.spec.ts`.
- [x] Delegation override was explicitly recorded for this worker run because subagent spawning is unavailable in-session. Evidence: `tasks/specs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`.

## Implementation
- [x] Add a bounded success-side low-yield stop for post-startup diff reviews without regressing legitimate deep reviews. Evidence: `scripts/lib/review-execution-runtime.ts`, `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`.
- [x] Make review-gated manifest/run-summary consumers require truthful terminal evidence or an explicit waiver. Evidence: `scripts/run-review.ts`, `orchestrator/src/cli/services/commandRunner.ts`, `orchestrator/tests/CommandRunnerReviewEvidenceConsistency.test.ts`, `tests/review-execution-telemetry.spec.ts`, `tests/run-review.spec.ts`.
- [x] Tighten large uncommitted review scope to require `--base`, `--commit`, or an explicit override. Evidence: `scripts/run-review.ts`, `scripts/lib/review-scope-advisory.ts`, `scripts/lib/review-launch-attempt.ts`, `orchestrator/tests/PipelineResolverEnvOverrides.test.ts`, `tests/review-launch-attempt.spec.ts`, `tests/run-review.spec.ts`.
- [x] Update standalone review docs/config text to match the new behavior. Evidence: `docs/standalone-review-guide.md`, `codex.orchestrator.json`.
- [x] Add focused regressions across `tests/run-review.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/review-execution-telemetry.spec.ts`, and the current large-scope advisory seam. Evidence: `tests/run-review.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/review-execution-telemetry.spec.ts`, `tests/review-launch-attempt.spec.ts`, `orchestrator/tests/PipelineResolverEnvOverrides.test.ts`.

## Validation
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." DIFF_BUDGET_OVERRIDE_REASON="Shared stacked provider-worker branch already exceeds the origin/main diff budget; CO-16 validation is scoped on top of that baseline and the local slice is intentionally smaller than the branch aggregate." node dist/bin/codex-orchestrator.js start implementation-gate --format json --no-interactive --task linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514`. Evidence: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T12-55-39-408Z-97722664/manifest.json`, `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T12-55-39-408Z-97722664/review/telemetry.json`.
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`. Evidence: `out/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/manual/20260324T1305Z-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T12-55-39-408Z-97722664/manifest.json`.
- [x] `npm run build`. Evidence: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T12-55-39-408Z-97722664/manifest.json`.
- [x] `npm run lint`. Evidence: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T12-55-39-408Z-97722664/manifest.json`.
- [x] `npm run test`. Evidence: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T12-55-39-408Z-97722664/manifest.json`.
- [x] `npm run docs:check`. Evidence: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T12-55-39-408Z-97722664/manifest.json`.
- [x] `npm run docs:freshness`. Evidence: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T12-55-39-408Z-97722664/manifest.json`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T12-55-39-408Z-97722664/manifest.json`.
- [x] `npm run review -- --manifest "$CODEX_ORCHESTRATOR_MANIFEST_PATH" --surface diff`. Evidence: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T12-55-39-408Z-97722664/manifest.json`, `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T12-55-39-408Z-97722664/review/telemetry.json`.
- [x] `npm run pack:smoke`. Evidence: `out/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/manual/20260324T1305Z-pack-smoke.log`.

## Delivery
- [ ] Open PR for `CO-16`, attach it to Linear, handle feedback, and wait for required checks to reach terminal green.
- [ ] Verify unresolved actionable review threads = `0` or record a waiver with evidence in PR review threads/task notes before moving to `In Review`.
- [ ] Merge the latest `origin/main` into the branch before review handoff, refresh the workpad to match current status and risks, and stop coding once the issue reaches `In Review`.
