# Task Checklist - CO-361 First Post-v0.2.0 Release Prep

- Linear Issue: `CO-361`
- MCP Task ID: `co-361-first-post-v0-2-0-release-prep`
- Primary PRD: `docs/PRD-co-361-first-post-v0-2-0-release-prep.md`
- TECH_SPEC: `docs/TECH_SPEC-co-361-first-post-v0-2-0-release-prep.md`
- Task spec: `tasks/specs/co-361-first-post-v0-2-0-release-prep.md`
- ACTION_PLAN: `docs/ACTION_PLAN-co-361-first-post-v0-2-0-release-prep.md`

## Checklist
- [x] Clean worktree created from updated `origin/main`, merge commit `375aec3cfee018b80bac6a4cb6e3ba357086c36d` remains reachable from `HEAD`, and the branch was rebased onto current `origin/main` commit `ca2fff503`. Evidence: `/Users/kbediako/Code/CO-co361-release` on branch `kb/co361-release`.
- [x] Docs-first packet registered. Evidence: PRD, TECH_SPEC, ACTION_PLAN, task spec, checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Pre-implementation docs-review evidence captured. Evidence: `.runs/co-361-first-post-v0-2-0-release-prep-docs-review/cli/2026-04-25T14-44-03-730Z-d90a8471/manifest.json` after local child-run fallback because delegation MCP rejected the clean worktree path.
- [x] Minimal release-prep diff applied. Evidence: `package.json`, `package-lock.json`, and `plugins/codex-orchestrator/.codex-plugin/plugin.json` now report `0.2.1`; `README.md` routes older package readers to `v0.2.0`; `docs/guides/codex-version-policy.md`, `docs/book/public-posture.md`, `docs/book/README.md`, and `docs/book/archive/codex-cli-0124-adoption.md` now present current `0.125.0` local/package posture while keeping portable `gpt-5.4` fallback wording and the cloud-only `0.124.0` split truthful. Current diff stat: `11 files changed, 87 insertions(+), 20 deletions(-)`.
- [x] Targeted posture checks recorded (`codex --version`, `codex debug models`, appserver/help, npm latest/global truth). Evidence: local `codex --version` returned `codex-cli 0.125.0`; `codex debug models` includes `gpt-5.5` with `xhigh`; `codex app-server --help` passed; `npm view @openai/codex version dist-tags --json` returned `version=0.125.0` and `dist-tags.latest=0.125.0`; `npm view @kbediako/codex-orchestrator dist-tags.latest version --json` returned published `0.2.0`, confirming this lane prepares the next unpublished `0.2.1` cut.
- [x] Release-prep validation completed (`npm run build`, `npm run docs:check`, `npm run docs:freshness`, `npm run pack:audit`, `npm run pack:smoke`). Evidence: `node scripts/delegation-guard.mjs --task co-361-first-post-v0-2-0-release-prep`; `node scripts/spec-guard.mjs --dry-run`; `npm run docs:freshness`; `npm run docs:check`; `npm run build`; `npm run pack:audit`; `npm run pack:smoke`; and diagnostics manifest `.runs/co-361-first-post-v0-2-0-release-prep/cli/2026-04-25T15-05-32-540Z-fd806d24/manifest.json` completed with build/lint/test/spec-guard success.
- [x] Branch judged ready for a release PR without publish/tag/merge actions. Evidence: branch rebased onto current `origin/main`; remaining diff stays release-prep-only on package metadata plus README/book/version-policy/task-packet surfaces; stale release-blocking `gpt-5.4` / `0.118.0` / `0.121.0` / current `0.124.0` wording was re-audited on the release-facing surface set; and rebased validation reruns passed for `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`, `npm run build`, `npm run pack:audit`, and `npm run pack:smoke`.

## Notes
- `codex-orchestrator review` was attempted against `.runs/co-361-first-post-v0-2-0-release-prep/cli/2026-04-25T15-05-32-540Z-fd806d24/manifest.json`, but the wrapper churned in low-signal bounded reinspection and produced no verdict before termination. Release-prep readiness therefore falls back to direct diff audit plus the passing targeted validation commands above.
