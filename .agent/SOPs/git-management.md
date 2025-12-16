# Git Management SOP

## Added 2025-12-15

This repo’s git practices prioritize cloneability, reviewability, and evidence-backed work.

## Principles
1. **One task → one branch.** Avoid mixing unrelated work.
2. **Keep `main` cloneable.** Don’t commit bulky/local artifacts.
3. **Evidence-first.** Link the run manifest in checklists (and optionally commits/PRs) after validations run.
4. **Prefer non-destructive commands.** Avoid rewriting history on shared branches.

## Branching
- Create a branch per task using the task id: `<task-id>/<slug>` (example: `0906-docs-hygiene-automation/docs-check`).
- Keep exploratory work in throwaway branches/worktrees; only preserve what you intend to review.
- Do not merge locally as part of an agent run; leave that to the reviewer/release process.

## Commits
- Commit only source/docs/config changes.
- Never commit generated/local directories (covered by `.gitignore`): `node_modules/`, `dist/`, `coverage/`, `out/`, `var/`, `.runs/`.
- If you need durable, reviewable evidence in-repo (e.g., a design snapshot), copy only the necessary subset into `archives/<task-id>/<YYYY-MM-DD>/` or `reference/<slug>/` with a short `README.md` and a manifest pointer.

**Commit message convention (recommended)**
- Subject: `<task-id>: <imperative summary>`
- Body: `Evidence: .runs/<task-id>/cli/<run-id>/manifest.json` (or `Evidence: N/A` when not applicable)

## Clean validation via worktree/clone
Before opening or updating a PR, re-run the core lane from a clean worktree so untracked/local-only files can’t mask failures:
```bash
git worktree add ../CO-ci HEAD
cd ../CO-ci
npm ci
node scripts/spec-guard.mjs --dry-run
npm run build
npm run lint
npm run test
npm run docs:check
```

Remove the worktree when finished:
```bash
cd -
git worktree remove ../CO-ci
```

## Parallel worktrees for parallel runs
When you need true parallelism (multiple runs at once), prefer separate worktrees per workstream. This avoids collisions in `node_modules/`, `dist/`, and other generated outputs.

Example:
```bash
git worktree add ../CO-a HEAD
git worktree add ../CO-b HEAD

cd ../CO-a && MCP_RUNNER_TASK_ID=<task-id>-a npx codex-orchestrator start diagnostics --format json
cd ../CO-b && MCP_RUNNER_TASK_ID=<task-id>-b npx codex-orchestrator start diagnostics --format json
```

Notes:
- Use distinct task IDs per worktree so `.runs/<task-id>/` and `out/<task-id>/` stay isolated.
- If you must share a task ID across concurrent runs, expect some lock contention while writing `out/<task-id>/runs.json`.

## Snapshot tags (learning pipeline)
- The learning pipeline may create lightweight tags like `learning-snapshot-<uuid>` on the current commit.
- Don’t push these tags by default.
- Don’t delete snapshot tags that are still referenced by manifests you care about; treat them as part of local auditability.

## External code
- Avoid git submodules; vendor external code into `packages/<project>/` and record provenance (example: `packages/design-reference-tools/VENDOR.md`).

## Safety notes
- Avoid `git reset --hard` / `git clean -fdx` unless you’re intentionally discarding work.
- If you need to context-switch, prefer a new worktree or `git stash -u` instead of partial commits.
