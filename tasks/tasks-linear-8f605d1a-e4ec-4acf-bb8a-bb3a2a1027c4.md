# Task Checklist - linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4

- Linear Issue: `CO-267` / `8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4`
- MCP Task ID: `linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4`
- Primary PRD: `docs/PRD-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`
- TECH_SPEC: `tasks/specs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`
- Classification: `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md`
- Parent manifest: `.runs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/cli/2026-04-20T00-16-23-383Z-f8073975/manifest.json`
- Workpad comment: `4f45cf6d-b02f-4feb-b040-9e353abd59e5`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Docs-First
- [x] CO-267 moved from `Ready` to `In Progress` before active work. Evidence: Linear transition at `2026-04-20T00:17:40.218Z`.
- [x] Initial attempt workpad created, then removed for Rework reset. Evidence: old Linear comment `581a5e67-69ab-4d38-9324-b5d22d59f8b1`; fresh Rework workpad `4f45cf6d-b02f-4feb-b040-9e353abd59e5`.
- [x] Pre-turn decomposition matrix and parallelization decision recorded. Evidence: `linear parallelization` audit entry for `parallelize_now` / `independent_scope_available`.
- [x] Same-issue child lane `freshness-baseline` completed successfully; accept was invalidated by live issue timestamp drift, so parent did not rely on an unaccepted patch. Evidence: `.runs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-freshness-baseline/cli/2026-04-20T00-19-19-851Z-7c494843/manifest.json`.
- [x] PRD drafted for the Apr 20 docs freshness maintenance lane. Evidence: `docs/PRD-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, stale-doc/spec classification contract, and validation requirements. Evidence: `tasks/specs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`, `docs/TECH_SPEC-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`.
- [x] ACTION_PLAN drafted for reproduction, classification, metadata refresh, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`.
- [x] Registry mirrors updated for the CO-267 packet. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Docs-review evidence captured before review handoff. Evidence: `.runs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-review/cli/2026-04-20T00-35-11-894Z-c71bbf2a/manifest.json`; P2 evidence-table finding addressed in `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md`.
- [x] Rework reset completed after PR #566 had already merged. Evidence: old workpad deleted, branch `linear/co-267-docs-freshness-rolling-baseline-r2` created from `origin/main` at `98991b622b99b4d0f31fa39cf98425cbfdd1a1b6`, fresh workpad comment `4f45cf6d-b02f-4feb-b040-9e353abd59e5`.
- [x] Rework parallelization decision recorded as parent-owned reset and current-main proof. Evidence: `linear parallelization` audit entry for `forbid_parallel` / `parent_only_mutation`.

## Baseline Reproduction
- [x] Parent `docs:freshness` failure reproduced. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/docs-freshness.log`, `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/docs-freshness.json`.
- [x] Parent `docs:freshness:maintain` failure reproduced. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/docs-freshness-maintain.log`, `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/docs-freshness-maintenance.json`.
- [x] Parent `spec-guard --dry-run` stale rows reproduced. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/spec-guard.log`.
- [x] Rework current-main `docs:freshness` failure reproduced. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-reset/docs-freshness.log`, `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-reset/docs-freshness-baseline.json` (`37` stale docs, `0` rolling rows).
- [x] Rework current-main `docs:freshness:maintain` failure reproduced. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-reset/docs-freshness-maintain.log`, `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-reset/docs-freshness-maintenance-baseline.json` (`block_policy_over_budget`, `blocking_changed_paths=0`).

## Classification And Implementation
- [x] Classified blocking stale docs by class, path family, last_review date, lineage, and disposition. Evidence: `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md`.
- [x] Classified stale active spec-guard rows by exact path and disposition. Evidence: `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md`.
- [x] Classified and reviewed/currented the CO-175 rolling freshness cohort. Evidence: `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md`, `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/after/docs-freshness.json`, `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/after/docs-freshness-maintenance.json`.
- [x] Applied reviewed refresh to exact stale docs registry rows and stale spec frontmatter rows without changing freshness gates. Evidence: `docs/docs-freshness-registry.json` and updated `tasks/specs/**` frontmatter rows.
- [x] Applied Rework reviewed refresh to the exact Apr 21 stale `0954` and `1311`-`1316` Task Packet / Task Mirror registry rows without changing freshness gates. Evidence: `docs/docs-freshness-registry.json`, `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md`, `docs/guides/docs-freshness-cohorts.md`, and `tasks/specs/0954-rlm-orchestrator-validation.md`.
- [x] Preserved CO-266 boundary and canonical CO-267 owner marker. Evidence: `tasks/specs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`, `tasks/index.json`, and this checklist.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/spec-guard.log`.
- [x] `npm run build`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/build.log`.
- [x] `npm run lint`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/lint.log`; passed with three existing warnings.
- [x] `npm run test`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/test.log` (`346` files / `4399` tests passed).
- [x] `npm run docs:check`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/docs-freshness.log`, `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/docs-freshness.json`.
- [x] `npm run docs:freshness:maintain`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/docs-freshness-maintain.log`, `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/docs-freshness-maintenance.json`.
- [x] `npm run repo:stewardship`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/repo-stewardship.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/validation/diff-budget.log`; override accepted for the canonical docs freshness maintenance refresh.
- [x] `codex-orchestrator review` / `npm run review` under `FORCE_CODEX_REVIEW=1`. Evidence: `../../.runs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/cli/2026-04-20T00-16-23-383Z-f8073975/review/telemetry.json` (`status=succeeded`, `review_outcome=bounded-success`).
- [x] Explicit elegance/minimality pass. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/manual/20260420T0053Z-elegance-review.md`.
- [x] Rework `node scripts/delegation-guard.mjs`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/delegation-guard.log`; direct `linear child-stream` failed closed on missing provider provenance, then diagnostics fallback manifest `.runs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-guard/cli/2026-04-21T05-46-49-274Z-af06141c/manifest.json` satisfied the guard.
- [x] Rework `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/spec-guard.log`.
- [x] Rework `npm run build`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/build.log`.
- [x] Rework `npm run lint`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/lint.log`; passed with three existing warnings.
- [x] Rework `npm run test`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/test.log` (`346` files / `4424` tests passed).
- [x] Rework `npm run docs:check`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/docs-check.log`.
- [x] Rework `npm run docs:freshness`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/docs-freshness.log`, `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/docs-freshness.json` (`0` stale rows).
- [x] Rework `npm run docs:freshness:maintain`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/docs-freshness-maintain.log`, `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/docs-freshness-maintenance.json` (`clean`, `policy_capacity=no_candidates`, `blocking_changed_paths=0`).
- [x] Rework `npm run repo:stewardship`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/repo-stewardship.log`.
- [x] Rework `node scripts/diff-budget.mjs`. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/rework-validation/diff-budget.log`.
- [x] Rework `codex-orchestrator review` / `npm run review` under `FORCE_CODEX_REVIEW=1`. Evidence: `.runs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/cli/2026-04-21T05-34-25-740Z-9cf43116/review/telemetry.json` (`status=succeeded`, `review_outcome=bounded-success`).
- [x] Rework explicit elegance/minimality pass. Evidence: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/manual/20260421T0600Z-elegance-review.md`.
- [ ] PR attachment and `pr ready-review` drain before review handoff

## Progress Log
- 2026-04-20: live Linear context showed CO-267 in `Ready`, no PR attachments, and no workpad. Parent moved it to `In Progress`, created branch `linear/co-267-docs-freshness-rolling-baseline`, created the single workpad, recorded `parallelize_now`, and launched same-issue child lane `freshness-baseline`.
- 2026-04-20: child lane succeeded and produced a baseline evidence patch; accept was invalidated because the Linear issue `updated_at` changed while the lane was running. Parent treated the patch as unaccepted and reran parent-owned baseline artifacts.
- 2026-04-20: before artifacts reproduced `docs:freshness FAILED - 4270 docs, 4273 registry entries`, `66` blocking stale docs, `221` CO-175 rolling rows, `0` missing registry rows, `0` missing-on-disk rows, `0` invalid registry entries, and `0` uncatalogued docs. `spec-guard --dry-run` reported six stale active specs.
- 2026-04-20: reviewed refresh applied to the exact classified stale registry rows, CO-175 rolling cohort rows, and stale active spec frontmatter rows. Focused after checks pass: `spec-guard --dry-run` OK, `docs:freshness` OK with `4277` docs / `4280` registry entries and zero stale rows, and `docs:freshness:maintain` returns `clean`.
- 2026-04-20: docs-review child stream completed and its P2 evidence-table finding was addressed by moving `tasks/specs/README.md` out of the spec-frontmatter table into registry-only classification.
- 2026-04-20: full validation floor passed through delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, docs:freshness:maintain, repo:stewardship, diff-budget, standalone review bounded-success, and elegance review.
- 2026-04-21: Rework reset found PR #566 already merged, created a clean r2 worktree from `origin/main`, and reproduced the remaining current-main failure as `37` stale Task Packet / Task Mirror rows with no rolling cohort rows. The patch refreshes only reviewed `0954` and `1311`-`1316` packet/mirror metadata, plus CO-267 evidence docs.
- 2026-04-21: Rework validation floor passed through delegation guard, spec guard, build, lint, full test suite (`346` files / `4424` tests), docs:check, docs:freshness, docs:freshness:maintain, repo:stewardship, diff-budget, standalone review bounded-success, and elegance review.

## Notes
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, or `spec-guard`.
- Do not hide the `221` CO-175 rolling rows.
- Do not expand CO-266 terminal-blocker advisory scope.
- Do not update `last_review` without path-level review evidence.
