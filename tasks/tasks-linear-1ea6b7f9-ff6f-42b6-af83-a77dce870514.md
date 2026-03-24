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
- [ ] Add a bounded success-side low-yield stop for post-startup diff reviews without regressing legitimate deep reviews.
- [ ] Make review-gated manifest/run-summary consumers require truthful terminal evidence or an explicit waiver.
- [ ] Tighten large uncommitted review scope to require `--base`, `--commit`, or an explicit override.
- [ ] Update standalone review docs/config text to match the new behavior.
- [ ] Add focused regressions across `tests/run-review.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/review-execution-telemetry.spec.ts`, and any current large-scope advisory test equivalent.

## Validation
- [ ] `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514`.
- [ ] `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] `npm run review`.
- [ ] `npm run pack:smoke`.

## Delivery
- [ ] Open PR for `CO-16`, attach it to Linear, handle feedback, and wait for required checks to reach terminal green.
- [ ] Verify unresolved actionable review threads = `0` or record a waiver with evidence in PR review threads/task notes before moving to `In Review`.
- [ ] Merge the latest `origin/main` into the branch before review handoff, refresh the workpad to match current status and risks, and stop coding once the issue reaches `In Review`.
