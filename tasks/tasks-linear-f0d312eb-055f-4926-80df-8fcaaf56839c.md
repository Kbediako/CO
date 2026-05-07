# Task Checklist - linear-f0d312eb-055f-4926-80df-8fcaaf56839c

- Linear Issue: `CO-102` / `f0d312eb-055f-4926-80df-8fcaaf56839c`
- MCP Task ID: `linear-f0d312eb-055f-4926-80df-8fcaaf56839c`
- Primary PRD: `docs/PRD-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`
- TECH_SPEC: `tasks/specs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`

## Docs-First
- [x] PRD refreshed to the reopened baseline-prevention scope. Evidence: `docs/PRD-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`.
- [x] TECH_SPEC refreshed to the reopened archive-eligibility scope. Evidence: `tasks/specs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`, `docs/TECH_SPEC-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`.
- [x] ACTION_PLAN refreshed for the reopened docs-first, archive-fix, and validation sequence. Evidence: `docs/ACTION_PLAN-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`.
- [x] `tasks/index.json` refreshed for the reopened packet review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` refreshed with the reopened lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` refreshed for the `CO-102` packet dates. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`. Evidence: `.agent/task/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md` `review_notes`.
- [ ] docs-review approval captured for the reopened packet scope. Evidence: pending.

## Workflow
- [x] `linear issue-context` inspected live team workflow states before transition work. Evidence: packaged `linear issue-context --issue-id f0d312eb-055f-4926-80df-8fcaaf56839c` on 2026-04-09.
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded on 2026-04-09.
- [x] Exactly one same-turn parallelization decision was recorded for the reopened attempt. Evidence: packaged `linear parallelization --decision stay_serial --reason single_bounded_change` on 2026-04-09.
- [x] Workspace moved from detached `HEAD` onto a task branch based on current `main`. Evidence: `linear/co-102-docs-baseline-regression-prevention`.
- [x] Prior attached PR feedback was swept before new implementation work. Evidence: merged PR `#370` review comments, reviews, and review threads show no unresolved actionable feedback.
- [ ] Exactly one persistent `## Codex Workpad` comment is refreshed for the reopened attempt. Evidence: pending refreshed workpad comment `3bb36aeb-adcf-44a3-8a86-7040107bef69`.

## Investigation
- [x] Current `spec-guard` baseline captured on the reopened branch. Evidence: `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/spec-guard.mjs --dry-run` returned `Spec guard: OK`.
- [x] Current `docs:check` baseline captured on the reopened branch. Evidence: `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:check` returned `docs:check: OK`.
- [x] Current `docs:freshness` baseline captured on the reopened branch. Evidence: `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:freshness` failed with `stale docs: 282` (`Task Packet=205`, `Task Mirror=41`, `Report Only=36`).
- [x] Archive automation and local dry-run behavior captured for the reopened branch. Evidence: GitHub Actions `Implementation Docs Archive Automation` run `24117518124` succeeded on 2026-04-08, and local `node scripts/implementation-docs-archive.mjs --dry-run` reported `Archived docs: 0`, `Skipped docs: 313`, `Stray candidates: 146`.
- [x] Root cause narrowed to the completion-vocabulary mismatch captured at baseline time in `scripts/implementation-docs-archive.mjs`. Evidence: at baseline capture time the script required `status === "succeeded"` plus `completed_at`, while `tasks/index.json` contained `59` completed items with `status: "completed"` plus `completed_at`.
- [ ] Any out-of-scope residual stale-doc seam split into a same-project follow-up instead of silently expanding scope. Evidence: pending only if needed after the post-fix rerun.

## Implementation
- [x] Reopened packet reviewed through an audited child docs-review stream before code edits continue. Evidence: `.runs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c-co-102-docs-review-r2/cli/2026-04-08T22-48-54-430Z-492ca414/manifest.json`.
- [x] `scripts/implementation-docs-archive.mjs` archive eligibility updated for the current completion vocabulary without weakening policy. Evidence: `scripts/implementation-docs-archive.mjs` now treats `completed` task metadata as terminal for packet archival and archives stale `docs/findings/*-deliberation.md` registry entries only when the linked task is terminal.
- [x] Focused regression coverage added for the current completion vocabulary and any linked-doc archive behavior touched by the fix. Evidence: `npx vitest run tests/implementation-docs-archive.spec.ts` passed `9/9`, including the new completed-task and stale report-only findings cases.
- [x] Residual truly-active stale docs reconciled truthfully after the archive fix rerun. Evidence: after the UTC rollover surfaced a `137`-doc active stale cohort (`1074`-`1092` packet family, `0940` active packet surfaces, and `docs/design/specs/HI_FI_DESIGN_TOOLKIT.md`), the exact cohort was re-reviewed and refreshed so `npm run docs:freshness` returned `Task Packet=0`, `Task Mirror=0`, and `Report Only=0`.
- [x] Final packet and workpad record which surfaces were archived, refreshed, or explicitly left active. Evidence: `tasks/specs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`, `tasks/index.json`, and `out/linear-f0d312eb-055f-4926-80df-8fcaaf56839c/manual/workpad.md`.
- [x] No review-policy weakening or unrelated runtime scope changes were introduced. Evidence: diff scope stays inside archive automation, task metadata backfill, packet/docs updates, and archive payload refresh; review policy files and runtime control surfaces were untouched.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --stream co-102-docs-review-r2 --format json` executed against the refreshed packet and failed only on the known repo-baseline `docs:freshness` stage. Evidence: `.runs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c-co-102-docs-review-r2/cli/2026-04-08T22-48-54-430Z-492ca414/manifest.json`.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:check`. Evidence: `docs:check: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:freshness`. Evidence: `OK` with `Task Packet=0`, `Task Mirror=0`, `Report Only=0`.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/implementation-docs-archive.mjs --dry-run`. Evidence: `Archived docs: 0`, `Skipped docs: 804`, `Stray candidates: 362`, `Dry run: no files were written.`
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run build`. Evidence: completed cleanly after the repair.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run lint`. Evidence: completed cleanly after the repair.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run test`. Evidence: completed cleanly after the repair (`320` files / `3200` tests passed). After the final `tests/run-review.spec.ts` threshold correction, the two touched review regressions were rerun directly and both passed.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/diff-budget.mjs`. Evidence: passed with `DIFF_BUDGET_OVERRIDE_REASON='CO-102 repo-baseline repair includes targeted active-doc refresh, registry normalization, and focused review/archive regressions'`.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c FORCE_CODEX_REVIEW=1 npm run review`. Evidence: the latest scoped wrapper-led review hit an explicit `startup-anchor` boundary before producing a code verdict because the reviewer drifted into `codex-memories` and `codex-skills` reads; telemetry is recorded at `.runs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c/cli/2026-04-08T22-32-52-844Z-c8d26259/review/telemetry.json`, and the lane uses the documented manual review fallback instead of mislabeling that boundary as a product finding.
- [x] Explicit elegance review recorded before any review handoff. Evidence: manual correctness/regressions review found no additional defects in the final changed surfaces beyond the already-fixed `exclude_paths` regression and brittle `run-review` threshold; the paired elegance pass kept the final solution at the minimum truthful shape: one archive guard, one focused archive regression test, one justified `run-review` expectation narrowing, and the exact active-doc freshness refresh required to clear the baseline.

## Handoff
- [ ] Workpad refreshed after packet reset, after implementation, and before the current stop point. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Unresolved actionable review threads are `0`, or a waiver is recorded with evidence before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: Linear state remains `In Progress` while docs refresh and implementation are still open.
