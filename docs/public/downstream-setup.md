# Downstream Setup

This guide is the downstream-safe setup path shipped in the npm package.

## Contract

- Once per machine: install Codex CLI and authenticate.
- Once per repo: seed the CO templates, run setup with the repo root so delegation is repo-scoped while bundled skills are installed and DevTools wiring is applied at the machine level, review the generated config, and start using task-scoped runs.
- CO-local ChatGPT-auth/appserver posture now uses `gpt-5.5` / `xhigh` on Codex CLI `0.128.0` when live access smoke passes; release-facing cloud/downstream pins remain evidence-gated in the version policy.
- Portable generated downstream defaults keep `gpt-5.4` / `xhigh` as a fallback when `gpt-5.5`, API/cloud portability, or downstream/no-network access is not proven.
- Local ChatGPT-auth `gpt-5.5` / `xhigh` is the preferred CO posture after `codex debug models` verifies current model access.
- `codex-orchestrator doctor` treats `gpt-5.5` as non-drift when `codex debug models` verifies current model access, and additive defaults keep fresh configs on portable fallback values unless `--auth-scope chatgpt` is explicitly requested after live access smoke; compatible prior `gpt-5.5` role files are preserved without requiring extra marker metadata.
- CO-196 posture lineage remains unchanged: npm is the supported baseline because it is the simplest supported CLI install path, and marketplace packaging is an additive registration path for newer Codex releases. `0.121.0` accepts both `codex marketplace add` and `codex plugin marketplace add`; `0.122.0+` require `codex plugin marketplace add`, and current local `0.128.0` also exposes `codex plugin marketplace upgrade` / `remove`.

## Once per machine

1. Install CO:
   ```bash
   npm i -g @kbediako/codex-orchestrator
   ```
2. Authenticate Codex:
   ```bash
   codex login
   # If browser auth is unavailable:
   codex login --device-auth
   ```
## Codex plugin marketplace install

Use this when you want Codex to discover and enable CO from the plugin browser, while keeping npm available as the baseline CLI install path.

1. Add the packaged marketplace root with the command that matches your Codex version:
   ```bash
   # Codex 0.121.0: either command works
   codex marketplace add "$(npm root -g)/@kbediako/codex-orchestrator"
   # Codex 0.122.0+:
   codex plugin marketplace add "$(npm root -g)/@kbediako/codex-orchestrator"
   ```
2. Open `/plugins` inside Codex.
3. Install `Codex Orchestrator`.
4. Restart Codex if the plugin does not appear immediately.

The shipped marketplace files are:

- `.agents/plugins/marketplace.json`
- `plugins/codex-orchestrator/.codex-plugin/plugin.json`
- `plugins/codex-orchestrator/.mcp.json`
- `plugins/codex-orchestrator/launcher.mjs`

- Launcher behaviour: The plugin entry points at `plugins/codex-orchestrator`, and its launcher reads the `codex-orchestrator` marketplace entry in `${CODEX_HOME:-~/.codex}/config.toml` to locate the recorded source checkout before it execs the packaged CO CLI there via `node`. Local-directory sources run from the recorded source path. Git-backed sources run from Codex's installed checkout under `${CODEX_HOME:-~/.codex}/.tmp/marketplaces/codex-orchestrator`, so the MCP registration path stays independent of a second `codex-orchestrator` path entry after install.
- Local-directory add: Run the version-appropriate add command against the repository root that contains those files instead of the npm install directory. `0.121.0` accepts either `codex marketplace add <repository-root>` or `codex plugin marketplace add <repository-root>`; `0.122.0+` require `codex plugin marketplace add <repository-root>`.
- Git-backed add: Pass a Git identifier or URL such as `owner/repo[@ref]`, an HTTPS Git URL, or an SSH Git URL rather than a local path.
- When to re-run add: Re-run the same version-appropriate add command if you move or replace a local-directory source, or if you remove Codex's installed marketplace checkout and want to restore the Git-backed install. `0.121.0` documents the add flow under both marketplace paths; `0.122.0+` document local directories plus Git-backed sources under `codex plugin marketplace add --help`.
- Marketplace updates/removal: On current local Codex CLI `0.128.0`, run `codex plugin marketplace upgrade codex-orchestrator` to refresh a Git-backed marketplace checkout when you want Codex to pull a newer source ref. Run `codex plugin marketplace remove codex-orchestrator` to remove the marketplace registration.
- Debug caveats: The bundled debug catalog can lag runtime posture briefly, and residual plugin warnings are local temporary plugin cache warnings rather than CO posture failures.

## Rollback and removal

- Uninstall the plugin from the Codex plugin browser when you want to remove it completely.
- Set the plugin entry in `${CODEX_HOME:-~/.codex}/config.toml` to `enabled = false` when you want to keep it installed but turn it off.
- Remove the marketplace registration if you no longer want Codex to read the shipped marketplace source:
  ```bash
  codex plugin marketplace remove codex-orchestrator
  ```
  Use this command on Codex CLI `0.125.0` or newer. On older support lanes, or if the remove command is unavailable, remove the `[marketplaces.codex-orchestrator]` block from `${CODEX_HOME:-~/.codex}/config.toml` manually.
- Remove the npm install when you no longer want the standalone CLI or when you no longer need it as the marketplace source:
  ```bash
  npm uninstall -g @kbediako/codex-orchestrator
  ```

## Once per repo

1. Seed the repo:
   ```bash
   codex-orchestrator init codex --cwd /path/to/repo
   cd /path/to/repo
   codex-orchestrator setup --yes --repo "$(pwd)"
   ```
2. Check readiness:
   ```bash
   codex-orchestrator doctor --format json
   ```
3. Review the generated files:
   - `AGENTS.md`
   - `.codex/config.toml`
   - `.codex/providers/README.md`
   - `.codex/providers/provider.env.example`
   - `.codex/providers/control.example.json`
   - `codex.orchestrator.json`
4. Start with a task-scoped flow:
   ```bash
   codex-orchestrator flow --task <task-id>
   ```

## Version-Specific Notes

- `codex exec` now accepts both a prompt argument and piped stdin; piped stdin is appended as a `<stdin>` block.
- `codex login --device-auth` is available for environments where browser sign-in is not practical.
- CO keeps review-wrapper prompt transport explicit and artifact-backed; do not assume every `codex review` code path matches `codex exec`.

## First-run checks

Use these before asking a reviewer to trust a new repo:

```bash
cd /path/to/repo
codex-orchestrator doctor --format json
codex-orchestrator flow --task <task-id>
NOTES="Goal: ... | Summary: ... | Risks: ..." codex-orchestrator review --task <task-id>
```

## Provider onboarding

For Linear and Telegram setup, continue with [provider-onboarding.md](provider-onboarding.md).
