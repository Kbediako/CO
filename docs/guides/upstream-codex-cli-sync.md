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
- Add `--no-push` only when you intentionally want local-only alignment without updating `origin/main`.
- Use managed/pinned CLI when you need a custom fork behavior or reproducible binary control. For routine usage, stock `codex` is sufficient when required features are enabled (`codex features list`).
