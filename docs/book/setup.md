# Setup

## Baseline Install

CO is shipped as the scoped npm package `@kbediako/codex-orchestrator`.

```bash
npm i -g @kbediako/codex-orchestrator
codex-orchestrator --version
```

Node.js `>=20` is required. npm remains the supported baseline because it gives downstream operators the CLI directly without requiring Codex plugin support.

## Machine Setup

```bash
codex login
codex-orchestrator --version
```

Use `codex login --device-auth` when browser auth is not practical.

Run repo-bound `codex-orchestrator setup --yes --repo /path/to/repo` after bootstrapping the downstream repository so delegation is registered with the repo root while bundled skills are installed and DevTools wiring is applied at the machine level.

## Codex Marketplace / Plugin Install

Use this path only on Codex releases that expose the marketplace/plugin flow. The npm install remains the baseline CLI path.

Packaged npm source:

```bash
# Codex 0.121.0 accepts either command.
codex marketplace add "$(npm root -g)/@kbediako/codex-orchestrator"

# Codex 0.122.0+ uses the plugin command.
codex plugin marketplace add "$(npm root -g)/@kbediako/codex-orchestrator"
```

For a local checkout, pass the repository root instead of the npm install path. For a Git-backed source, pass `owner/repo[@ref]`, an HTTPS Git URL, or an SSH Git URL. Use `codex marketplace add ...` only on Codex `0.121.0`; use `codex plugin marketplace add ...` on `0.122.0+`.

On current local Codex CLI `0.130.0`, refresh a Git-backed marketplace checkout with:

```bash
codex plugin marketplace upgrade codex-orchestrator
```

Then open `/plugins` in Codex, install `Codex Orchestrator`, and restart Codex if the plugin does not appear immediately.

The shipped marketplace files are:

- `.agents/plugins/marketplace.json`
- `plugins/codex-orchestrator/.codex-plugin/plugin.json`
- `plugins/codex-orchestrator/.mcp.json`
- `plugins/codex-orchestrator/launcher.mjs`

The plugin launcher reads the `codex-orchestrator` marketplace entry in `${CODEX_HOME:-~/.codex}/config.toml` and resolves the recorded source checkout before starting the packaged CO CLI with `node`. Local-directory sources run from the recorded path. Git-backed sources run from Codex's installed marketplace checkout under `${CODEX_HOME:-~/.codex}/.tmp/marketplaces/codex-orchestrator`.

Re-run the version-appropriate marketplace add command after moving a local-directory source, replacing it, or removing Codex's installed marketplace checkout.

CO-518 adopts local ChatGPT-auth/appserver posture on Codex CLI `0.130.0` after local command/runtime, package smoke, runtime canary, and release-note evidence. Release-facing marketplace/downstream-smoke workflow pins still intentionally hold at Codex CLI `0.125.0` until required cloud canary and fallback cloud evidence are clean. Model/runtime posture remains governed by `docs/guides/codex-version-policy.md`: use `gpt-5.5` / `xhigh` for validated local ChatGPT-auth/appserver access, and keep `gpt-5.4` / `xhigh` as the portable fallback when access, API/cloud portability, or downstream/no-network evidence is missing.

## Rollback / Removal

- Uninstall `Codex Orchestrator` from the Codex plugin browser to remove the plugin.
- Set the plugin entry in `${CODEX_HOME:-~/.codex}/config.toml` to `enabled = false` to disable without uninstalling.
- On Codex CLI `0.125.0` or newer, remove the marketplace registration with `codex plugin marketplace remove codex-orchestrator`; on older support lanes or when that command is unavailable, remove the `[marketplaces.codex-orchestrator]` block from `${CODEX_HOME:-~/.codex}/config.toml` manually.
- Remove the standalone CLI with:
  ```bash
  npm uninstall -g @kbediako/codex-orchestrator
  ```

## Repository Bootstrap

```bash
codex-orchestrator init codex --cwd /path/to/repo
cd /path/to/repo
codex-orchestrator setup --yes --repo /path/to/repo
codex-orchestrator doctor --format json
codex-orchestrator flow --task <task-id>
```

`init codex` seeds:

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/providers/README.md`
- `.codex/providers/provider.env.example`
- `.codex/providers/control.example.json`
- `codex.orchestrator.json`

Provider-specific setup continues in [docs/public/provider-onboarding.md](../public/provider-onboarding.md).
