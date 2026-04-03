# Downstream Setup

This guide is the downstream-safe setup path shipped in the npm package.

## Contract

- Once per machine: install Codex CLI, authenticate, install bundled skills, and register delegation or DevTools wiring.
- Once per repo: seed the CO templates, review the generated config, and start using task-scoped runs.
- CO currently targets Codex CLI `0.118.0`.

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
3. Install bundled skills and register delegation or DevTools wiring:
   ```bash
   codex-orchestrator setup --yes
   ```
4. Check readiness:
   ```bash
   codex-orchestrator doctor --format json
   ```

## Once per repo

1. Seed the repo:
   ```bash
   codex-orchestrator init codex --cwd /path/to/repo
   ```
2. Review the generated files:
   - `AGENTS.md`
   - `.codex/config.toml`
   - `.codex/providers/README.md`
   - `.codex/providers/provider.env.example`
   - `.codex/providers/control.example.json`
   - `codex.orchestrator.json`
3. Start with a task-scoped flow:
   ```bash
   codex-orchestrator flow --task <task-id>
   ```

## 0.118-specific notes

- `codex exec` now accepts both a prompt argument and piped stdin; piped stdin is appended as a `<stdin>` block.
- `codex login --device-auth` is available for environments where browser sign-in is not practical.
- CO keeps review-wrapper prompt transport explicit and artifact-backed; do not assume every `codex review` code path matches `codex exec`.

## First-run checks

Use these before asking a reviewer to trust a new repo:

```bash
codex-orchestrator doctor --format json
codex-orchestrator flow --task <task-id>
NOTES="Goal: ... | Summary: ... | Risks: ..." codex-orchestrator review --task <task-id>
```

## Provider onboarding

For Linear and Telegram setup, continue with [provider-onboarding.md](provider-onboarding.md).
