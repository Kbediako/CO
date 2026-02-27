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
- [ ] Version bumped to `0.1.37` (`package.json`, lockfile). - Evidence: files + commit.
- [ ] Release PR opened and monitored to merge with feedback handled in-thread. - Evidence: PR link, monitor logs.
- [ ] Signed tag `v0.1.37` created/verified/pushed. - Evidence: tag verify logs.
- [ ] GitHub release workflow succeeded and npm publish confirmed. - Evidence: workflow logs, `npm view` output.
- [ ] Downstream/global smoke completed successfully. - Evidence: manual logs.

## Workstream B - Codex 0.107 Canary (Dummy Repos)
- [ ] Canary automation matrix executed for stable `0.106.0` baseline. - Evidence: canary logs.
- [ ] Canary automation matrix executed for prerelease `0.107.x`. - Evidence: canary logs.
- [ ] Regression comparison + fallback/error-path audit completed. - Evidence: comparison summary.
- [ ] Global version policy decision recorded (adopt or hold). - Evidence: summary doc/checklist notes.

## Validation
- [ ] 01 `node scripts/delegation-guard.mjs`.
- [ ] 02 `node scripts/spec-guard.mjs --dry-run`.
- [ ] 03 `npm run build`.
- [ ] 04 `npm run lint`.
- [ ] 05 `npm run test`.
- [ ] 06 `npm run docs:check`.
- [ ] 07 `npm run docs:freshness`.
- [ ] 08 `node scripts/diff-budget.mjs`.
- [ ] 09 `npm run review`.
- [ ] 10 `npm run pack:smoke`.

## Closeout
- [ ] Checklist mirror synced (`tasks/`, `.agent/task/`, `docs/TASKS.md`).
- [ ] Final evidence summary posted with release/canary decision.
