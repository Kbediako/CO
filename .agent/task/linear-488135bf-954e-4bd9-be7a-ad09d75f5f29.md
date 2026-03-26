# Task Checklist - linear-488135bf-954e-4bd9-be7a-ad09d75f5f29

- MCP Task ID: `linear-488135bf-954e-4bd9-be7a-ad09d75f5f29`
- Primary PRD: `docs/PRD-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`
- TECH_SPEC: `tasks/specs/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`

## Docs-first
- [x] PRD drafted for the `CO-13` provider-worker child-stream lane. Evidence: `docs/PRD-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`, `docs/TECH_SPEC-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`.
- [x] `tasks/index.json` registers the `CO-13` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `CO-13` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`. Evidence: `.agent/task/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`.
- [x] docs-review child-stream attempt cleared delegation guard plus deterministic docs gates, and the explicit review-stage stall override was captured before implementation. Evidence: `.runs/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29-docs-review/cli/2026-03-26T14-57-27-835Z-3c42c662/manifest.json`, `out/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/manual/20260326T150716Z-docs-review-override.md`.

## Investigation
- [x] Live Linear workflow states and current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id 488135bf-954e-4bd9-be7a-ad09d75f5f29 --format json`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id 488135bf-954e-4bd9-be7a-ad09d75f5f29 --state "In Progress" --format json`.
- [x] Required Symphony baseline and current CO provider-worker/control-host contracts were audited before implementation. Evidence: `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`, `AGENTS.md`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/controlHostCliShell.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, `scripts/delegation-guard.mjs`, `codex.orchestrator.json`, `out/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/manual/20260326T144912Z-baseline-audit.md`.
- [x] Current provider-worker manifest and environment were verified as the parent-run authority baseline for this issue. Evidence: `.runs/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/cli/2026-03-26T14-32-37-352Z-eda5d760/manifest.json`, `out/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/manual/20260326T144912Z-baseline-audit.md`.
- [x] The workpad was created and this attempt is tracked on branch `linear/co-13-provider-worker-child-streams`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear upsert-workpad --issue-id 488135bf-954e-4bd9-be7a-ad09d75f5f29 --body-file /tmp/co13-workpad.md --format json`, `git branch --show-current`.

## Implementation
- [ ] Add a bounded provider-worker child-stream launcher that reuses the sanctioned provider-child task identity and parent-run lineage contract. Evidence: pending code changes.
- [ ] Surface truthful child-stream lineage in provider-worker proof/read-model artifacts. Evidence: pending code changes.
- [ ] Prevent scheduler/provider discovery from treating nested provider-worker child manifests as scheduler-owned provider runs. Evidence: pending code changes.
- [ ] Update provider-worker instructions/docs so review-style child streams use the new audited path instead of the blanket override when applicable. Evidence: pending code changes.
- [ ] Add focused regressions for launcher fail-closed behavior, lineage surfacing, and nested-manifest exclusion. Evidence: pending code changes.

## Validation
- [ ] `node scripts/delegation-guard.mjs`. Evidence: pending validation output.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending validation output.
- [ ] `npm run build`. Evidence: pending validation output.
- [ ] `npm run lint`. Evidence: pending validation output.
- [ ] `npm run test`. Evidence: pending validation output.
- [ ] `npm run docs:check`. Evidence: pending validation output.
- [ ] `npm run docs:freshness`. Evidence: pending validation output.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending validation output.
- [ ] `npm run review`. Evidence: pending validation output.
- [ ] `npm run pack:smoke`. Evidence: pending validation output.
- [ ] Live-style validation proves truthful provider-worker child-stream lineage with and without a child stream. Evidence: pending validation output.

## Delivery
- [ ] Open PR for `CO-13`, attach it to Linear, handle feedback, and wait for required checks to reach terminal green.
- [ ] Verify unresolved actionable review threads = `0` or record a waiver with evidence in PR review threads/task notes before moving to `In Review`.
- [ ] Merge the latest `origin/main` into the branch before review handoff, refresh the workpad to match current status and risks, and stop coding once the issue reaches `In Review`.
