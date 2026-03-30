# Task Checklist - linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60

- Linear Issue: `CO-38` / `1e1a879a-42d2-4321-9a43-3ecc0ee7ce60`
- MCP Task ID: `linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60`
- Primary PRD: `docs/PRD-linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`
- TECH_SPEC: `tasks/specs/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`

## Docs-First
- [x] PRD drafted for the current-tree vitest teardown-hang investigation lane. Evidence: `docs/PRD-linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`.
- [x] TECH_SPEC drafted with the live baseline and bounded fix path. Evidence: `tasks/specs/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`, `docs/TECH_SPEC-linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`.
- [x] ACTION_PLAN drafted for docs-review, repro, implementation, validation, and review handoff. Evidence: `docs/ACTION_PLAN-linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`. Evidence: `.agent/task/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`.
- [x] Standalone pre-implementation review approval captured in spec notes. Evidence: `tasks/specs/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md` `review_notes`.
- [x] docs-review approval captured for registered `linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60-docs-review/cli/2026-03-29T21-23-42-158Z-b4084f98/manifest.json`.

## Implementation
- [x] Fresh local repros recorded for the current workspace, detached `HEAD`, and PR `#320` head; the original teardown-hang hypothesis did not reproduce on those trees. Evidence: `out/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60/manual/20260329T212513Z-scrubbed-full-suite-repro`, `out/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60/manual/20260329T213045Z-baseline-head-full-suite-repro`, `out/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60/manual/20260329T213535Z-pr320-head-full-suite-repro`.
- [x] Actual `Core Lane` blocker isolated from GitHub run `23712103211` to `tests/cli-command-surface.spec.ts > prints pr ready-review help`. Evidence: `gh run view 23712103211 --repo Kbediako/CO --job 69073407145 --log`.
- [x] Smallest responsible fix landed without reducing coverage. Evidence: `bin/codex-orchestrator.ts`, `tests/cli-command-surface.spec.ts`.
- [x] Focused regressions updated for the chosen seam. Evidence: `tests/cli-command-surface.spec.ts`.
- [ ] Fresh PR head `Core Lane` reaches a terminal result. Evidence: pending.

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [x] Scrubbed repro and focused owner-isolation commands. Evidence: the three local repro artifact roots above plus the cited GitHub job log for run `23712103211`.
- [ ] `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run build`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run lint`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run test`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run docs:check`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run docs:freshness`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: pending.
- [ ] Explicit elegance/minimality pass recorded after standalone review. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60 npm run pack:smoke` if downstream-facing CLI/package/review-wrapper surfaces change. Evidence: pending or not needed.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: Linear comment `400ff34e-f3ff-4b31-b74f-4dfbc81fcda1`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
