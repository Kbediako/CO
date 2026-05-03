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
  - advanced feature gates (`memories` (legacy alias `memory_tool`), sqlite, and removed-feature entries such as `js_repl`) and their cloud/local compatibility semantics; verify names with `codex features list` and do not carry removed features forward as default-on or break-glass toggles

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

## Release detector
- `.github/workflows/codex-cli-release-detector.yml` runs on schedule and through `workflow_dispatch`.
- Manual dry-run:
  - `npm run codex:release-detect -- --dry-run --artifact out/codex-cli-release-detection/detection.json`
- The detector reads GitHub `openai/codex` release truth and npm `@openai/codex` dist-tags/time, compares the latest stable candidate against `docs/guides/codex-version-policy.md`, release-facing workflow pins, `cloud-canary`, and `tests/pack-smoke.spec.ts`, then emits `out/codex-cli-release-detection/detection.json`.
- When a new stable candidate is unrepresented, the detector uses the Linear `create-follow-up` helper with canonical owner key `codex-cli-release-intake:stable:<version>` and refreshes that issue's workpad with the CO-386 release-intake checklist. Existing canonical owners are reused; duplicates are not created.
- Prerelease-only movement is recorded in the artifact without opening release-intake work.
- Fail-closed states are intentional: missing Linear auth for a required mutation, ambiguous GitHub/npm truth, GitHub/npm mismatch, rate-limit uncertainty, or missing local policy/pin surfaces exits non-zero instead of reporting success.
- Retry behavior is operator-owned: rerun the workflow after restoring GitHub/Linear credentials or rate-limit headroom. Use `workflow_dispatch` with `dry_run=true` to verify the artifact before allowing mutation.

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
