# Task Checklist - linear-7b3de1c1-f420-4203-bb8c-494dadecaa88

- Linear Issue: `CO-319` / `7b3de1c1-f420-4203-bb8c-494dadecaa88`
- MCP Task ID: `linear-7b3de1c1-f420-4203-bb8c-494dadecaa88`
- Primary PRD: `docs/PRD-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`
- TECH_SPEC: `tasks/specs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`
- Parent manifest: `.runs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/cli/2026-04-23T01-27-41-396Z-fb6749c4/manifest.json`
- Workpad comment: `0b3a3dbe-8698-4914-8b95-76d9a452b6d4`
- Canonical owner key: `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`

## Docs-First
- [x] Live `linear issue-context` inspected before mutation. Evidence: provider-worker read at 2026-04-23T01:28Z confirmed `Ready`, no PR attachments, no workpad, and live team states `In Progress` / `In Review` / `Merging` / `Rework`.
- [x] CO-319 moved from `Ready` to `In Progress` before active work. Evidence: Linear transition at `2026-04-23T01:28:57.917Z`.
- [x] Single required workpad created and updated in place. Evidence: Linear comment `0b3a3dbe-8698-4914-8b95-76d9a452b6d4`.
- [x] Pre-turn decomposition matrix and `parallelize_now` decision recorded. Evidence: `linear parallelization` audit entry for `parallelize_now` / `independent_scope_available`.
- [x] Same-issue child lane `docs-packet-core` completes and is accepted, rejected, or invalidated. Evidence: `.runs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88-docs-packet-core/cli/2026-04-23T01-32-43-084Z-6b522b42/manifest.json` (`status=succeeded`, decision `invalidated` because the patch preserved the wrong fallback evidence set).
- [x] PRD drafted for the CO-319 live-owner recreation lane. Evidence: `docs/PRD-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`.
- [x] TECH_SPEC drafted with the exact canonical owner key, marker, maintenance evidence, and non-goal boundary. Evidence: `tasks/specs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`, `docs/TECH_SPEC-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`.
- [x] ACTION_PLAN drafted for owner recreation, follow-up issue creation/reuse, registry mirrors, and validation. Evidence: `docs/ACTION_PLAN-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`.
- [x] Registry mirrors updated for CO-319. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Docs-review evidence captured before handoff, or truthful fallback recorded if the child stream stops only on unrelated baseline debt. Evidence: `.runs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88-co319-docs-review/cli/2026-04-23T01-48-13-963Z-63fb3c20/manifest.json`, `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/validation/docs-check.log`, `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/validation/docs-freshness.log`, `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/validation/docs-freshness-maintain.log`, and `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/manual/docs-review-fallback.md`.

## Canonical Owner Recreation
- [x] Preserved CO-318 maintenance evidence is copied from the exact report path into the CO-319 packet and follow-up owner issue. Evidence: `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/manual/co318-preserved-docs-freshness-maintenance-excerpt.json`, `linear create-follow-up` response for `CO-320`.
- [x] A live same-project follow-up issue is created or reused for canonical owner key `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`. Evidence: `CO-320` / `2b99df6c-e17c-4fac-a146-ed4dedc989e5`, created via the `Backlog` path; current live `issue-context` now shows state `In Progress`.
- [x] The resulting owner issue is stamped with `codex-orchestrator:canonical-owner-key=docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30` and can be reused by future provider lanes. Evidence: `CO-320` body and `linear create-follow-up` response canonical owner block.
- [x] The owner issue keeps the scope narrow to the remaining Mar 23 historical task-packet cohort and does not reopen `CO-300`, weaken docs freshness, or broaden CO-318. Evidence: `CO-320` body plus the parent follow-up input files under `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/manual/`.

## Validation
- [x] `linear parallelization` contract satisfied with one completed same-issue child lane in this turn. Evidence: child-lane manifest `.runs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88-docs-packet-core/cli/2026-04-23T01-32-43-084Z-6b522b42/manifest.json` plus parent invalidation record.
- [x] Repo validation/review scope is rerun to the truthful floor required by the landed diff, or a narrower docs-only rationale is recorded with evidence. Evidence: `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/validation/spec-guard.log`, `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/validation/docs-check.log`, `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/validation/docs-freshness.log`, `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/validation/docs-freshness-maintain.log`, `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/validation/repo-stewardship.log`, `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/validation/diff-budget.log`, `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/validation/json-parse.log`, and `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/validation/diff-check.log`.
- [x] Standalone review and explicit elegance/minimality pass are recorded before any review handoff if the final diff is non-trivial. Evidence: `.runs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/cli/2026-04-23T01-27-41-396Z-fb6749c4/review/prompt.txt`, `.runs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/cli/2026-04-23T01-27-41-396Z-fb6749c4/review/output.log`, `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/manual/standalone-review-fallback.md`, and `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/manual/elegance-review.md`.
- [x] Workpad refreshed after owner creation and packet/mirror updates; refresh again before any review or closeout handoff. Evidence: Linear workpad comment `0b3a3dbe-8698-4914-8b95-76d9a452b6d4`.

## Notes
- Preserved cohort facts: `freshness_decision=block_unowned_repo_debt`, `owner_issue=CO-300`, `owner_issue_action.mode=create_required`, `reason=configured_owner_terminal`, `issue_state=Done`, `stale_entries=4`, `lineage.task_number_range=1319-1321`, and `expires_after=2026-04-29`.
- Sample cohort paths: `tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`, `tasks/tasks-1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`, `tasks/tasks-1319-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `tasks/tasks-linear-856c1318-524f-4db3-8d4a-b357ec51c304.md`.
- Parent owns live Linear mutations and registry/task mirrors; the first child lane is now complete and invalidated, so packet-core edits are back under parent ownership.
- Draft PR `#610` is attached and restacked on current `origin/main` head `a81deca41`; no review handoff has happened yet because the PR is still draft and GitHub checks plus `pr ready-review` remain pending.
