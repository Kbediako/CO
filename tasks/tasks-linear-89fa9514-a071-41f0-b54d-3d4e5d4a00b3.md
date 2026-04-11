# Task Checklist - linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3

- Linear Issue: `CO-126` / `89fa9514-a071-41f0-b54d-3d4e5d4a00b3`
- MCP Task ID: `linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3`
- Primary PRD: `docs/PRD-linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3.md`
- TECH_SPEC: `tasks/specs/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3.md`

## Docs
- [x] Live Linear workflow states were rechecked before transition. Evidence: `linear issue-context --issue-id 89fa9514-a071-41f0-b54d-3d4e5d4a00b3`.
- [x] Issue moved from `Ready` to `In Progress` before active coding. Evidence: `linear transition --state "In Progress"` succeeded at `2026-04-11T13:50:51.124Z`.
- [x] Required same-turn parallelization decision recorded. Evidence: `linear parallelization --decision stay_serial --reason single_bounded_change`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: remote comment `5c5ef835-4142-4b45-8603-57e01e1616dd`.
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/task/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: this checklist, mirrored checklist, PRD, TECH_SPEC, ACTION_PLAN, and registry updates.
- [x] Docs-review child-stream evidence recorded before implementation continues, with truthful packet-local fallback for forced-review drift. Evidence: `.runs/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3-co-126-docs-review-rerun/cli/2026-04-11T14-04-14-631Z-ef2cd11d/manifest.json`, `out/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/manual/20260411T1409Z-docs-review-fallback.md`.

## Investigation
- [x] Workspace moved from detached `HEAD` onto branch `linear/co-126-historical-reference-archive-residue` before repo edits. Evidence: `git switch -c linear/co-126-historical-reference-archive-residue`.
- [x] Live repo stewardship residue set was captured and narrowed to the current six tracked surfaces. Evidence: `npm run repo:stewardship` on `2026-04-11` reported `6` action-required historical surfaces and `0` uncatalogued surfaces.
- [x] Current retained use was verified for the kept reference candidates. Evidence: `tasks/specs/0956-subagents-skill-codex-cli-refresh.md`, `docs/guides/pixel-perfect-local-clones.md`.
- [x] Pre-implementation issue-quality review captured. Evidence: `tasks/specs/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3.md` review notes and readiness gate.

## Implementation
- [x] Add a subtree-local README anchor for `reference/0956-subagents-skill-codex-cli-refresh/*`. Evidence: `reference/0956-subagents-skill-codex-cli-refresh/README.md`.
- [x] Add a root-level rationale anchor for retained root-level reference history under `reference/`. Evidence: `reference/README.md`.
- [x] Delete `archives/REPORT.mcp_code_mode.json` if it remains unreferenced. Evidence: `git rm archives/REPORT.mcp_code_mode.json` after confirming there were no live repo references.
- [x] Rerun `repo:stewardship` and confirm the targeted residue no longer appears as unexplained `update`. Evidence: `out/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/manual/repo-stewardship.json`, `out/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/manual/repo-stewardship.md` (`4611` tracked files, `0` action-required, generated `2026-04-11T14:15:34.229Z`).

## Validation
- [x] Audited docs-review child stream or truthful packet-local fallback recorded. Evidence: `.runs/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3-co-126-docs-review-rerun/cli/2026-04-11T14-04-14-631Z-ef2cd11d/manifest.json`, `out/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/manual/20260411T1409Z-docs-review-fallback.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run repo:stewardship`. Evidence: zero action-required after the staged archive deletion.
- [x] `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 node scripts/repo-stewardship-audit.mjs --report out/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/manual/repo-stewardship.json --summary-markdown out/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/manual/repo-stewardship.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (2 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run build`.
- [x] `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run lint`.
- [x] `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run test`. Evidence: `330` test files / `3588` tests passed.
- [x] `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run docs:check`.
- [x] `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 npm run docs:freshness`.
- [x] `MCP_RUNNER_TASK_ID=linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3 node scripts/diff-budget.mjs`. Evidence: final rerun after the docs-only review-fallback update reported `scope=working-tree, files=9/25, lines=507/1200, +506/-1`.
- [x] Manifest-backed standalone review plus explicit elegance review before handoff. Evidence: `.runs/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/cli/2026-04-11T13-49-50-356Z-aa2ff05d/review/telemetry.json`, `out/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/manual/20260411T142419Z-standalone-review-fallback.md`, `out/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/manual/20260411T142419Z-elegance-review.md`.

## Handoff
- [x] Workpad refreshed after docs-first, after implementation, and before the current stop point. Evidence: local source `out/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3/manual/workpad.md`, remote comment `5c5ef835-4142-4b45-8603-57e01e1616dd`.
- [ ] PR attached to the issue before review-state transition.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` or explicit pushback recorded.
- [ ] Issue moved to `In Review`. Evidence: pending.

## Progress Log
- 2026-04-11: Issue moved to `In Progress`, `stay_serial` / `single_bounded_change` was recorded, the branch was created, and the single workpad comment was created on `CO-126`.
- 2026-04-11: Live `repo:stewardship` output confirmed the current residue set is six paths, not the older seven-path issue snapshot.
- 2026-04-11: Current retained use was reverified before implementation: the 0956 evidence pack is still cited by its task spec, and the WordPress mirror example is still cited by the pixel-perfect clone guide.
- 2026-04-11: Pre-implementation review approved a bounded keep/delete cleanup instead of any stewardship-catalog redesign.
- 2026-04-11: The first docs-review child run failed `docs:check` on planned-anchor path references plus the `docs/TASKS.md` line cap; after generic anchor wording and `docs:archive-tasks`, the rerun passed docs gates and packet-local fallback was accepted when the forced review drifted into low-signal archive speculation without a verdict.
- 2026-04-11: Implemented the bounded residue dispositions by adding `reference/README.md`, adding `reference/0956-subagents-skill-codex-cli-refresh/README.md`, and deleting unreferenced `archives/REPORT.mcp_code_mode.json`; the explicit stewardship rerun now reports `4611` tracked files and `0` action-required.
- 2026-04-11: The full validation floor passed through `docs:freshness`, and a later explicit stewardship rerun on the staged final tree reported `4617` tracked files and `0` action-required.
- 2026-04-11: Forced standalone review failed closed with `review_outcome=failed-boundary` / `termination_boundary.kind=startup-anchor`; manual review fixed the stale `docs/TASKS.md` snapshot line and accepted the remaining diff, and the explicit elegance pass found no further simplification worth taking.

## Relevant Files
- `reference/README.md`
- `reference/0956-subagents-skill-codex-cli-refresh/*`
- `reference/0956-subagents-skill-codex-cli-refresh/README.md`
- `reference/mirror.config.wp.example.json`
- `archives/REPORT.mcp_code_mode.json`
- `docs/repo-stewardship-catalog.json`
- `scripts/repo-stewardship-audit.mjs`

## Notes
- `archives/REPORT.mcp_code_mode.md` from the issue description is already deleted on current main and is not part of the live tracked residue set for this lane.
- The implemented minimal diff is two README anchors under `reference/` plus archive JSON deletion; no catalog semantics or unrelated historical cleanup was reopened.
