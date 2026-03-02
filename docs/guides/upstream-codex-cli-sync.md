# Upstream Codex CLI Sync (CO Strategy)

## Goals
- Track upstream Codex CLI without breaking CO stability.
- Keep CO patches small, auditable, and removable when upstream merges fixes.

## Branch strategy
- `upstream-mirror`: clean mirror of upstream main (no CO changes).
- `co/main`: CO integration branch (user-facing releases).
- `co/patches`: small, atomic CO patches on top of upstream.

## Sync cadence
- Frequent mirror updates (daily/weekly).
- Scheduled integration windows to rebase/merge `co/patches` onto the latest upstream mirror.

## Quick upgrade audit (operator checklist)
- Confirm installed CLI and latest upstream release metadata:
  - `codex --version`
  - `gh release list --repo openai/codex --limit 10`
  - `gh release view rust-v<version> --repo openai/codex --json tagName,isPrerelease,publishedAt,url`
- Confirm fork divergence against upstream:
  - `git -C /path/to/codex fetch --all --prune`
  - `git -C /path/to/codex rev-list --left-right --count main...upstream/main`
  - `git -C /path/to/codex log --oneline --no-merges main..upstream/main -n 20`
  - `git -C /path/to/codex log --oneline --no-merges --branches --not upstream/main -n 20`
- Record behavioral deltas that can affect CO:
  - multi-agent tooling/runtime (`spawn_agents_on_csv`, role/thread behavior)
  - review-mode restrictions (collab/web search disabled in review delegation)
  - approvals/sandbox/config default shifts (for example `allow_login_shell`, approval policy deprecations)
  - app-server/runtime capabilities (`runtimeMode` interactions, app-server v2 behavior, fallback/error contracts)
  - advanced feature gates (`js_repl`, `memory_tool`, sqlite) and their cloud/local compatibility semantics (including `js_repl` default-on + break-glass toggles)

## Patch discipline
- Keep patches minimal and scoped.
- Tag commits with `CO-PATCH:` and link any upstream issue/PR if applicable.
- Remove patches once upstream merges the fix.

## Automation (recommended)
- CI job to:
  1) Fetch upstream and fast-forward `upstream-mirror`.
  2) Attempt rebase of `co/patches`.
  3) Run a lightweight smoke suite.
  4) Open a sync PR if clean; otherwise open a conflict PR with notes.

## Release labeling
- Tag CO releases with upstream anchors (e.g., `co-vX.Y.Z+upstream-vA.B.C`).
- Changelog sections:
  - Upstream delta summary
  - CO patches added/removed
  - Migration notes

## Local operator flow (CO)
- Default path (stock CLI): align the fork and skip managed rebuild:
  - `scripts/codex-cli-refresh.sh --repo /path/to/codex --align-only`
- Managed/pinned path (optional): align and rebuild CO-managed CLI:
  - `scripts/codex-cli-refresh.sh --repo /path/to/codex --force-rebuild`
- Managed routing is opt-in even after rebuild:
  - `export CODEX_CLI_USE_MANAGED=1`
- Add `--no-push` only when you intentionally want local-only alignment without updating `origin/main`.
- Use managed/pinned CLI when you need custom fork behavior or reproducible binary control. Verify rebuild SHA/features before switching and after each refresh.
- For routine usage, keep stock `codex` as default when required features are enabled (`codex features list`).
