# Task Checklist - linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59

- Linear Issue: `CO-139` / `2136ea50-1fdf-44c2-ae3c-0e8d8a364b59`
- MCP Task ID: `linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59`
- Primary PRD: `docs/PRD-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`
- TECH_SPEC: `tasks/specs/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`

## Docs
- [x] Live Linear workflow states were rechecked before transition. Evidence: `linear issue-context --issue-id 2136ea50-1fdf-44c2-ae3c-0e8d8a364b59`.
- [x] Issue moved from `Ready` to `In Progress` before resumed active coding. Evidence: live `linear issue-context --issue-id 2136ea50-1fdf-44c2-ae3c-0e8d8a364b59` now shows `state.name = "In Progress"` after the resumed-turn `linear transition --state "In Progress"`.
- [x] Required same-turn parallelization decisions were recorded. Evidence: initial `linear parallelization --decision parallelize_now --reason independent_scope_available`, then resumed-turn `linear parallelization --decision stay_serial --reason review_or_validation_only`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: remote comment `7e7990ec-41eb-4c15-a74e-2a456bb9634c`.
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/task/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`, `tasks/specs/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`, `docs/ACTION_PLAN-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`, `tasks/tasks-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`, `.agent/task/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Docs-review child-stream evidence recorded before implementation continues. Evidence: `.runs/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59-docs-review/cli/2026-04-13T05-43-32-126Z-20d66f81/manifest.json`, `.runs/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59-docs-review-rerun/cli/2026-04-13T05-49-59-846Z-5b842a2d/manifest.json`, `.runs/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59-docs-review-r3/cli/2026-04-13T05-51-09-698Z-75ff9d46/manifest.json`.

## Investigation
- [x] Workspace moved from detached `HEAD` onto branch `linear/co-139-top-level-stewardship-surfaces` before repo edits. Evidence: `git switch -c linear/co-139-top-level-stewardship-surfaces`.
- [x] Initial consumer evidence inventory captured for the targeted surfaces. Evidence: `scripts/lib/docs-helpers.js`, `package.json`, `docs/design/PRD-frontend-design-pipeline-v2.md`, `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`, `tasks/frontend-design-pipeline-v2.md`, `tsconfig.json`, `tsconfig.build.json`, `orchestrator/src/cli/services/*.ts`, `adapters/tests/registry.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Stale retained guidance was identified in `.ai-dev-tasks/*.md`. Evidence: `.ai-dev-tasks/create-prd.md`, `.ai-dev-tasks/generate-tasks.md`, `.ai-dev-tasks/process-task-list.md`.
- [x] Same-issue child lane completed successfully for `prompt-snippets/**` and produced a bounded patch artifact for parent review. Evidence: `.runs/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59-prompt-snippets-audit/cli/2026-04-12T03-59-15-439Z-2066ecbb/manifest.json`, `.runs/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59-prompt-snippets-audit/cli/2026-04-12T03-59-15-439Z-2066ecbb/provider-linear-child-lane.patch`.
- [x] Pre-implementation issue-quality review captured. Evidence: `tasks/specs/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`.

## Implementation
- [x] Refresh `.ai-dev-tasks/*.md` to current docs-first/template truth. Evidence: `.ai-dev-tasks/create-prd.md`, `.ai-dev-tasks/generate-tasks.md`, `.ai-dev-tasks/process-task-list.md`.
- [x] Record explicit dispositions and sharpen rationale/checks for the targeted surface set. Evidence: `docs/PRD-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`, `docs/repo-stewardship-catalog.json`.
- [x] Accept, reject, or invalidate the `prompt-snippets/**` child-lane patch with an explicit reason. Evidence: accepted metadata-only patch in `prompt-snippets/frontend-aesthetics-v1.md`.
- [x] Delete or move any genuinely low-value residue found in the target set, or record a truthful none-found conclusion. Evidence: explicit `none to delete or move beyond stale retained guidance` conclusion in `docs/PRD-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`.
- [x] Rerun `repo:stewardship` and confirm the target set is clean or explicitly justified. Evidence: `out/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/repo-stewardship.json`, `out/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/manual/repo-stewardship.json`, `out/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/manual/repo-stewardship.md`.

## Validation
- [x] Audited docs-review child stream or truthful packet-local fallback recorded. Evidence: latest rerun reached repo-wide `docs:freshness` baseline only after passing `docs:check`.
- [x] `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 npm run repo:stewardship`.
- [x] `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 node scripts/repo-stewardship-audit.mjs --report out/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/manual/repo-stewardship.json --summary-markdown out/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/manual/repo-stewardship.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 node scripts/delegation-guard.mjs`.
- [x] `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 node scripts/spec-guard.mjs --dry-run`.
- [x] `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 npm run build`.
- [x] `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 npm run lint`.
- [x] `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 npm run test`.
- [x] `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 npm run docs:check`.
- [x] `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 npm run docs:freshness`.
- [x] `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 node scripts/diff-budget.mjs`.
- [x] Manifest-backed standalone review plus explicit elegance review before handoff. Evidence: manual fallback note `out/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/manual/20260413T071602Z-manual-review-fallback.md`, elegance note `out/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/manual/20260413T071602Z-elegance-review.md`, wrapper manifest `.runs/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/cli/2026-04-13T06-52-54-173Z-efcd8ca6/manifest.json`, telemetry `.runs/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/cli/2026-04-13T06-52-54-173Z-efcd8ca6/review/telemetry.json`.

## Handoff
- [x] Workpad refreshed after docs-first, after the current-main sync, and before review handoff.
- [ ] PR attached to the issue before review-state transition.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: `git rev-list --left-right --count origin/main...HEAD` now reports `0 0`.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` or explicit pushback recorded.
- [ ] Issue moved to `In Review`. Evidence: pending.

## Progress Log
- 2026-04-12: Issue moved to `In Progress`, `parallelize_now` / `independent_scope_available` was recorded, the single workpad comment was created, and the workspace branch `linear/co-139-top-level-stewardship-surfaces` was created from detached `HEAD`.
- 2026-04-12: Initial inventory confirmed the named surfaces are still active; `.ai-dev-tasks/*.md` is the first concrete stale-retained cluster because it still cites deprecated template paths and old task-id rules.
- 2026-04-12: The `prompt-snippets-audit` child lane completed successfully and returned a bounded metadata-only patch for `prompt-snippets/frontend-aesthetics-v1.md`.
- 2026-04-13: Parent accepted the prompt-snippet metadata patch, refreshed `.ai-dev-tasks/*.md`, sharpened exact stewardship checks for the refreshed surfaces, and recorded the explicit disposition matrix in the PRD.
- 2026-04-13: Docs-review was rerun until packet-local `docs:check` defects were fixed; the final child-stream rerun passed `docs:check`, and the later current-main sync plus local reruns cleared the earlier broader `docs:freshness` blocker for this lane.
- 2026-04-13: Resumed from `Ready`, recorded `stay_serial` / `review_or_validation_only`, fast-forwarded the branch to current `origin/main`, and reapplied the lane diff with only packet-mirror conflicts.
- 2026-04-13: Provider-only `CODEX_ORCHESTRATOR_*` overrides were stripped for repo-local validation commands so the issue workspace, not the shared root checkout, supplied the validation truth.
- 2026-04-13: Forced standalone review executed under `FORCE_CODEX_REVIEW=1` and wrote explicit `failed-boundary` telemetry (`termination_boundary.kind = command-intent`, `provenance = validation-suite`) after the reviewer launched `npm run docs:check`; the manual fallback then repaired the stale blocked-state packet/workpad narrative and recorded no remaining diff-local findings.
- 2026-04-13: Post-sync reruns reconfirmed `delegation-guard`, `spec-guard`, `build`, `lint`, `test`, `docs:check`, `docs:freshness`, `repo:stewardship`, the explicit audit report, and `diff-budget` as green, so the remaining work is PR attachment plus review handoff rather than a validation blocker.

## Relevant Files
- `.ai-dev-tasks/*`
- `.codex/orchestrator.toml`
- `adapters/**/*`
- `eslint-plugin-patterns/*`
- `patterns/**/*`
- `prompt-snippets/frontend-aesthetics-v1.md`
- `types/*`
- `package.json`
- `package-lock.json`
- `codex.orchestrator.json`
- `mcp-client.json`
- `design.config.yaml`
- `tsconfig.json`
- `tsconfig.build.json`
- `docs/repo-stewardship-catalog.json`
- `scripts/repo-stewardship-audit.mjs`

## Notes
- `archives/**` / `reference/**` cleanup remains out of scope for this lane and stays owned by `CO-126`.
- The presence of broad existing stewardship globs does not count as this issue’s explicit disposition pass; the lane still needs surface-by-surface reasoning and any targeted refreshes.
- The truthful outcome for this slice is update-focused rather than delete-focused: no additional in-scope top-level residue qualified for `move` or `delete` once current consumer evidence was rechecked.
- The earlier repo-wide `docs:freshness` blocker was cleared by the current-main sync and reruns in this workspace; do not reopen generic freshness repair from `CO-139`.
- Review handoff now depends on PR attachment, clean PR checks, and the bounded `pr ready-review` drain rather than on any remaining local validation debt.
