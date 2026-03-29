# ACTION_PLAN - CO: Investigate Core Lane vitest teardown hang after visible full-suite pass

## Added by Bootstrap 2026-03-30

## Traceability
- Linear issue: `CO-38` / `1e1a879a-42d2-4321-9a43-3ecc0ee7ce60`
- Linear URL: https://linear.app/asabeko/issue/CO-38/co-investigate-core-lane-vitest-teardown-hang-after-visible-full-suite

## Summary
- Goal: Finish `CO-38` by identifying the current full-suite teardown-hang owner on the live tree, landing the smallest fix that restores truthful terminal exit, and proving that a fresh PR head `Core Lane` reaches terminal status.
- Scope: docs-first packet, branch bootstrap, audited docs-review child stream, scrubbed local repro, concrete owner capture, bounded fix, focused regressions, full validation, and normal review handoff.
- Assumptions:
  - the older CO-24 websocket-listener mitigation is already present and cannot be blindly re-applied as the whole answer
  - the current owner likely lives in a lingering watcher/server/child-process seam that only appears at full-suite teardown scale

## Evidence Update - 2026-03-30
- Fresh scrubbed local repros on the current workspace, detached `HEAD` baseline, and PR `#320` head all exited cleanly, so the original local teardown-hang narrative is not the active blocker on those trees.
- The cited GitHub run `23712103211` failed a specific CLI help test instead (`tests/cli-command-surface.spec.ts > prints pr ready-review help`), so the implementation now targets that evidence-backed seam.

## Milestones & Sequencing
1) Register the CO-38 docs-first packet, update `tasks/index.json`, refresh `docs/TASKS.md`, mirror the checklist, and keep the single Linear workpad current.
2) Run `linear child-stream --pipeline docs-review` and record the manifest before implementation.
3) Reproduce the scrubbed full-suite hang, capture process/sample/handle evidence, and narrow the current owner on the live tree.
4) Implement the smallest proven fix and add or update focused regression coverage around the owning seam.
5) Run the required validation floor, standalone review, and elegance pass; refresh the workpad; then prepare the PR and review handoff only if validation is truly terminal and green.

## Dependencies
- `tasks/index.json`
- `docs/TASKS.md`
- `vitest.config.core.ts`
- `vitest.config.ts`
- late-suite tests and helpers in `tests/**` and `orchestrator/tests/**`
- GitHub Actions `Core Lane`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 node scripts/spec-guard.mjs --dry-run`
  - `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`
  - scrubbed local repro and focused owner-isolation commands
  - `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run pack:smoke` if downstream-facing CLI/package/review-wrapper surfaces change
- Rollback plan:
  - revert the narrow fix if it widens behavior or fails to restore terminal suite exit
  - if the lane cannot finish the fix safely, stop with explicit owner evidence and keep the issue active instead of masking the hang

## Risks & Mitigations
- Risk: the current owner is nondeterministic or only manifests under the full scrubbed environment.
  - Mitigation: keep the repro path identical to the issue evidence and store durable artifacts under the task out directory.
- Risk: the older CO-24 fix partially masks but does not eliminate the live owner, causing false confidence.
  - Mitigation: explicitly treat the old fix as baseline and remeasure current ownership from scratch.
- Risk: the clean fix spans more than one late-suite seam.
  - Mitigation: follow the smallest evidence-backed chain only and file a follow-up for any meaningful out-of-scope hardening.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-30
