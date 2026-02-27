# Task Checklist - 0985-co-release-0-1-37-codex-0-107-canary

- MCP Task ID: `0985-co-release-0-1-37-codex-0-107-canary`
- Primary PRD: `docs/PRD-co-release-0-1-37-codex-0-107-canary.md`
- TECH_SPEC: `tasks/specs/0985-co-release-0-1-37-codex-0-107-canary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-co-release-0-1-37-codex-0-107-canary.md`

> Set `MCP_RUNNER_TASK_ID=0985-co-release-0-1-37-codex-0-107-canary` for orchestrator commands. Required quality lane for implementation/release edits: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`, `npm run pack:smoke`.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/checklist mirror). - Evidence: `docs/PRD-co-release-0-1-37-codex-0-107-canary.md`, `docs/TECH_SPEC-co-release-0-1-37-codex-0-107-canary.md`, `docs/ACTION_PLAN-co-release-0-1-37-codex-0-107-canary.md`, `tasks/specs/0985-co-release-0-1-37-codex-0-107-canary.md`, `tasks/tasks-0985-co-release-0-1-37-codex-0-107-canary.md`, `.agent/task/0985-co-release-0-1-37-codex-0-107-canary.md`.
- [x] `tasks/index.json` + `docs/TASKS.md` updated for task registration/status. - Evidence: `tasks/index.json`, `docs/TASKS.md`.
- [x] Delegated research/implementation/validation streams captured. - Evidence: `.runs/0985-co-release-0-1-37-codex-0-107-canary-research/cli/2026-02-27T12-34-37-083Z-95807044/manifest.json`, `.runs/0985-co-release-0-1-37-codex-0-107-canary-implementation/cli/2026-02-27T12-34-35-543Z-e6ed5ce4/manifest.json`, `.runs/0985-co-release-0-1-37-codex-0-107-canary-validation/cli/2026-02-27T12-34-36-253Z-02dae2ac/manifest.json`, `out/0985-co-release-0-1-37-codex-0-107-canary/manual/delegated-research.log`, `out/0985-co-release-0-1-37-codex-0-107-canary/manual/delegated-implementation.log`, `out/0985-co-release-0-1-37-codex-0-107-canary/manual/delegated-validation.log`.
- [x] Docs-review manifest captured before implementation edits. - Evidence: failed attempts `.runs/0985-co-release-0-1-37-codex-0-107-canary/cli/2026-02-27T12-34-16-242Z-6c5cad02/manifest.json` (delegation guard), `.runs/0985-co-release-0-1-37-codex-0-107-canary/cli/2026-02-27T12-36-49-210Z-0d27d3df/manifest.json` (`docs/TASKS.md` line budget); pass `.runs/0985-co-release-0-1-37-codex-0-107-canary/cli/2026-02-27T12-41-11-710Z-77820f2c/manifest.json`, logs `out/0985-co-release-0-1-37-codex-0-107-canary/manual/docs-review-pre-implementation.log`, `out/0985-co-release-0-1-37-codex-0-107-canary/manual/docs-review-pre-implementation-rerun.log`, `out/0985-co-release-0-1-37-codex-0-107-canary/manual/docs-review-pre-implementation-rerun2.log`.

## Workstream A - CO 0.1.37 Release
- [x] Version bumped to `0.1.37` (`package.json`, lockfile). - Evidence: `package.json`, `package-lock.json`, commit `c5ebe0e33`.
- [x] Release lifecycle completed with documented PR-create permission blocker and direct-main fallback push. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/release-main-push.log`.
- [x] Signed tag `v0.1.37` created/verified/pushed. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/release-tag-verify.log`, `out/0985-co-release-0-1-37-codex-0-107-canary/manual/release-tag-push.log`.
- [x] GitHub release workflow succeeded and npm publish confirmed. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/release-workflow-run-id.log`, `out/0985-co-release-0-1-37-codex-0-107-canary/manual/release-workflow-watch.log`, `out/0985-co-release-0-1-37-codex-0-107-canary/manual/release-verify.log`.
- [x] Downstream/global smoke completed successfully. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/release-downstream-smoke.log`.

## Workstream B - Codex 0.107 Canary (Dummy Repos)
- [x] Canary automation matrix executed for stable `0.106.0` baseline. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/codex-version-canary/stable/00-install.log` through `99-summary.json`, plus required cloud rerun `out/0985-co-release-0-1-37-codex-0-107-canary/manual/codex-version-canary/stable/06-cloud-canary-required-with-env.log`.
- [x] Canary automation matrix executed for prerelease `0.107.x`. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/codex-version-canary/prerelease/00-install.log` through `99-summary.json`, plus required cloud rerun `out/0985-co-release-0-1-37-codex-0-107-canary/manual/codex-version-canary/prerelease/06-cloud-canary-required-with-env.log`.
- [x] Regression comparison + fallback/error-path audit completed. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/codex-version-canary/compare/pass-rate-summary.json`.
- [x] Global version policy decision recorded (adopt or hold). - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/codex-version-canary/compare/decision-go-no-go.md` (decision: GO for global update to `0.107.0-alpha.4` with `0.106.0` rollback pin retained).

## Validation
- [x] 01 `node scripts/delegation-guard.mjs`. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/cloudrerun-01-delegation-guard.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run`. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/cloudrerun-02-spec-guard.log`.
- [x] 03 `npm run build`. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/cloudrerun-03-build.log`.
- [x] 04 `npm run lint`. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/cloudrerun-04-lint.log`.
- [x] 05 `npm run test`. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/cloudrerun-05-test.log`.
- [x] 06 `npm run docs:check`. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/cloudrerun-06-docs-check.log`.
- [x] 07 `npm run docs:freshness`. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/cloudrerun-07-docs-freshness.log`.
- [x] 08 `node scripts/diff-budget.mjs`. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/cloudrerun-08-diff-budget.log`.
- [x] 09 `npm run review`. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/cloudrerun-09-review.log`.
- [x] 10 `npm run pack:smoke`. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/cloudrerun-10-pack-smoke.log`.

## Closeout
- [x] Checklist mirror synced (`tasks/`, `.agent/task/`, `docs/TASKS.md`). - Evidence: `tasks/tasks-0985-co-release-0-1-37-codex-0-107-canary.md`, `.agent/task/0985-co-release-0-1-37-codex-0-107-canary.md`, `docs/TASKS.md`.
- [x] Final evidence summary posted with release/canary decision. - Evidence: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/codex-version-canary/compare/decision-go-no-go.md`.
