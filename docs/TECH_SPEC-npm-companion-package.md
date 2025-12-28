# Technical Spec - Codex Orchestrator NPM Companion Package (Task 0914)

## Overview
- Objective: Make the orchestrator publishable as a single npm package with a sterile tarball, stable MCP entrypoints, and a tag-driven release workflow that publishes from immutable artifacts.
- In Scope:
  - Package metadata and publish gating (`files` allowlist, `prepack`, pack audit, smoke test).
  - Schema resolution independent of package name.
  - MCP stdio server command, `self-check`, `init`, and `doctor` CLI subcommands.
  - Templates shipped under `templates/` only.
  - Optional heavy dependency handling via optional peer deps and dynamic import.
  - Release workflow and CI pack audit gate.
- Out of Scope:
  - New orchestrator pipeline features or manifest schema redesign.
  - Shipping internal docs, tasks, or `.agent/**` content in the package.
  - Introducing background telemetry or postinstall hooks.

## Architecture & Design
### Current State
- `package.json` is now publishable (no `private: true`), includes a `files` allowlist, and heavy deps are optional peers; tarball contents are controlled by pack audit + allowlist.
- `npm run build` uses `tsconfig.build.json`; `clean:dist` + `prepack` exist, but ad-hoc builds can still leave stale `dist/` unless cleaned.
- Pack audit restricts `dist/` to runtime subtrees; the `files` allowlist mirrors those subtrees so non-runtime `dist/**` output never ships.
- `scripts/run-review.ts` enforces a non-interactive guard in CI (stdin disabled; non-interactive env flags set).
- Base logger uses `console.info` (stdout); MCP stdout-only guarantees are enforced by the `mcp serve` stdout guard.
- Runtime schema resolution uses the `imports` alias with a fallback to `schemas/manifest.json`.
- MCP usage still has legacy scripts in `scripts/`, but `mcp-client.json` now points at `codex-orchestrator mcp serve`.
- Templates now live under `templates/`, while prompt assets remain under `.agent/**` and must not ship in the tarball.
- Module system is ESM (`type: module`) with NodeNext resolution; `dist/bin/codex-orchestrator.js` preserves `#!/usr/bin/env node`.

### Proposed Changes
#### Package metadata + tarball allowlist
- Add `files` allowlist in `package.json` to include only:
  - `dist/bin/**`
  - `dist/orchestrator/**`
  - `dist/packages/**`
  - `dist/scripts/design/pipeline/**`
  - `dist/types/**`
  - `schemas/**`
  - `templates/**` (optional)
  - `README.md`
  - `LICENSE`
- Remove `private: true`, add `engines: { node: ">=20" }`, and add `publishConfig` (public access; provenance handled by the release workflow when OIDC is available).
- Prefer `files` allowlist over `.npmignore`.

#### Schema resolution independent of package name (Pattern A)
- Choose Pattern A: add `package.json` `imports` alias (example: `"#co/schema/manifest": "./schemas/manifest.json"`).
- Resolve schema path using `createRequire(import.meta.url).resolve("#co/schema/manifest")` so the schema is independent of package name.
- Rationale: Pattern A decouples schema resolution from package name and aligns with ESM/NodeNext; the fallback keeps compatibility when `imports` resolution is unavailable.
- Fallback to Pattern B when `imports` resolution fails: walk up from `import.meta.url` to a package root and resolve `schemas/manifest.json`.
- Acceptance tests must cover both paths (alias and fallback).

#### Prepack, pack audit, and smoke test
- Add `prepack` script that runs: clean dist -> build -> pack audit.
- Limit `tsconfig.build.json` to runtime sources plus `scripts/design/pipeline/**` so internal scripts (docs hygiene, review tooling, adapter helpers) never compile into `dist/`.
- Add `pack:audit` script that runs `npm pack --json`, parses the file list, and enforces:
  - Required files present (example: `dist/bin/codex-orchestrator.js`, `schemas/manifest.json`, `README.md`, `LICENSE`).
  - Dist allowlist is limited to runtime subtrees (example: `dist/bin/**`, `dist/orchestrator/**`, `dist/packages/**`, `dist/scripts/design/pipeline/**`, `dist/types/**`); reject other dist paths such as `dist/patterns/**`.
  - Forbidden prefixes are absent (`.agent/`, `docs/`, `tasks/`, `.runs/`, `out/`, `archives/`, `scripts/`, `tests/`, `evaluation/`, `adapters/`, `.github/`, `node_modules/`).
  - Dist test artifacts are rejected (`dist/**/tests/**`, `dist/**/*.test.*`, `dist/**/*.spec.*`).
  - Optional size budget (fail if the tarball exceeds the configured threshold).
- Add a pack smoke test that installs the `.tgz` in a temp directory and runs:
  - `codex-orchestrator --help`
  - `codex-orchestrator --version`
  - `codex-orchestrator self-check --format json`
  - Uses `npm install` in a temp directory (CI-only network use).

#### CLI companion surface
- Add `codex-orchestrator mcp serve` for MCP stdio:
  - Protocol output to stdout only.
  - Logs to stderr only (for the orchestrator code path).
  - Delegates to `codex mcp-server` with inherited stdio; enforce or verify downstream `codex` keeps logs off stdout (wrapper or integration test).
  - No `console.log` in the MCP server path.
- Add `codex-orchestrator self-check --format json` as a safe command for smoke tests.
- Add `codex-orchestrator --version` output for pack smoke tests.
- Add `codex-orchestrator init codex` for templates:
  - Explicit invocation only; no postinstall.
  - Non-overwriting by default; `--force` required to overwrite.
  - Prints a list of files written.

#### Templates shipping safety
- Introduce `templates/` in the package (no `.agent/**` shipped).
- Add `templates/README.md` with disclaimers:
  - Examples only; no stability guarantees (may change without semver).
  - Not auto-loaded; used only by explicit `init`.
- Add a lightweight `templateVersion` marker (JSON or front matter) in templates.

#### Optional heavy dependencies + doctor
- Move Playwright-class dependencies to optional peer deps with `peerDependenciesMeta`.
- Use dynamic import with an optional loader that resolves from CWD first, then falls back to package resolution.
- Add `codex-orchestrator doctor`:
  - Detects missing optional deps, reports exact install commands.
  - Only installs with explicit confirmation if an install option is added.

#### Release workflow (tag-driven + immutable artifacts)
- Require tags `vX.Y.Z` or `vX.Y.Z-alpha.N` and enforce tag version == `package.json` version.
- Stable tags publish with `dist-tag latest`; alpha tags publish with `dist-tag alpha` and GitHub prerelease.
- Publish from immutable tarball attached to the GitHub Release asset.
- Prefer npm trusted publishing (OIDC) and provenance if available.
- Release workflow runs `npm run clean:dist` before `npm run build` to avoid stale `dist/**` artifacts in the tarball.
- Publish job uses `NODE_AUTH_TOKEN` (set from `secrets.NPM_TOKEN`) when present (no provenance); if the token is absent, publish via OIDC with `id-token: write` + `--provenance`.
- Decision: keep the NPM token fallback until trusted publishing is fully configured; OIDC remains the preferred path.

#### Release portability (required in workflow docs)
- Preferred download method (with retries):
  - `gh release download <tag> --repo <org/repo> --pattern "*.tgz" --dir <out>`
  - Retry loop with backoff; requires `contents:read` permissions.
- Fallback when `gh` is unavailable:
  - Use `actions/github-script` to resolve asset id, then `curl -L -H "Accept: application/octet-stream"` to download.
- Last-resort fallback:
  - Pass the tarball between jobs using `actions/upload-artifact` and `actions/download-artifact`.

### Data Persistence / State Impact
- No changes to manifest schema contents; only schema resolution path and packaging location change.
- `init` writes into user-controlled repo paths, never into `node_modules`.

### External Dependencies
- GitHub CLI (`gh`) for preferred release asset download.
- `actions/github-script` and `curl` for fallback asset retrieval.
- npm trusted publishing (OIDC) if enabled by the registry.

## Operational Considerations
- Failure Modes:
  - Pack audit false positives or missing required files in the tarball.
  - Schema resolution fails if `imports` alias is missing and fallback is incorrect.
  - MCP server logs accidentally sent to stdout (protocol corruption).
  - `codex review` prompts interactively in CI (review handoff not automation-safe).
  - Optional deps missing and commands fail without clear guidance.
- Observability & Telemetry:
  - Telemetry default-off; no network calls unless explicitly enabled.
  - MCP and CLI logs should be explicit and go to stderr for stdio commands.
  - `npm run review` must remain non-interactive in CI; if `codex review` can prompt, add a guard/flag or documented env requirement to force non-interactive mode.
- Security / Privacy:
  - No postinstall scripts.
  - No writes to `node_modules`; all outputs go to `.runs/` or configured run dirs.
  - Publish from immutable artifact; use OIDC/provenance where supported.
- Performance Targets:
  - Tarball size within configured budget.
  - Pack audit and smoke test complete within a single CI job without network flakiness.

## Testing Strategy
- Unit / Integration:
  - Schema resolver tests for imports alias and fallback (Pattern A + B).
  - CLI tests for `mcp serve` stdout/stderr separation.
  - `init` tests: non-overwrite by default, `--force` required, prints written files.
  - Optional deps loader tests: resolve from CWD first, then package.
  - Shebang test on `dist/bin/codex-orchestrator.js` and ESM import sanity.
- Tooling / Automation:
  - `npm run pack:audit` and `npm run pack:smoke` in CI.
  - CI pack audit gate using `npm pack --json` and required/forbidden lists.
  - CI review handoff runs with an explicit non-interactive guard (flag or env), or fails fast if the Codex CLI attempts to prompt.
- Rollback Plan:
  - If release workflow fails, re-tag after fixing metadata; do not publish from non-release artifacts.
  - Keep changes in isolated commits so packaging changes can be reverted without affecting runtime logic.

## Documentation & Evidence
- Linked PRD: `docs/PRD-npm-companion-package.md`
- Run Manifest (docs review): `.runs/0914-npm-companion-package/cli/2025-12-28T14-48-57-207Z-01b03374/manifest.json`
- Metrics / State Snapshots: `.runs/0914-npm-companion-package/metrics.json`, `out/0914-npm-companion-package/state.json`

## Open Questions
- Do we require a hard tarball size budget at v1, or start with a soft warning?
- Should `mcp serve` accept a `--log-file` option for structured logs, or keep only stderr?

## Approvals
- Engineering: pending
- Reviewer: pending
