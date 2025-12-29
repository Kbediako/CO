# Task 0916 - Codex Orchestrator NPM Companion Package Publishability

- MCP Task ID: `0916-npm-companion-package-publishability`
- Primary PRD: `docs/PRD-npm-companion-package-publishability.md`
- Tech Spec: `docs/TECH_SPEC-npm-companion-package-publishability.md`
- Action Plan: `docs/ACTION_PLAN-npm-companion-package-publishability.md`
- Mini-spec: `tasks/specs/0916-npm-companion-package-publishability.md`
- Run Manifest (docs review): `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-40-22-001Z-96dbf5f0/manifest.json`
- Metrics/State: `.runs/0916-npm-companion-package-publishability/metrics.json`, `out/0916-npm-companion-package-publishability/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: this commit.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-40-22-001Z-96dbf5f0/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0916-npm-companion-package-publishability/metrics.json`, `out/0916-npm-companion-package-publishability/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0916-npm-companion-package-publishability.md`, and `tasks/index.json` - Evidence: this commit.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-40-22-001Z-96dbf5f0/manifest.json`.

### Packaging & Tarball Controls

#### Package metadata + allowlist
- [x] Update package publish metadata and allowlist - Evidence: `package.json`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
  - Files: `package.json`
  - Acceptance:
    - Add `files` allowlist: `dist/bin/**`, `dist/orchestrator/**`, `dist/packages/**`, `dist/scripts/design/pipeline/**`, `dist/types/**`, `schemas/**`, optional `templates/**`, `README.md`, `LICENSE`.
    - Add `engines: { "node": ">=20" }` and `publishConfig` (public access; provenance handled in the OIDC publish path).
    - Add `imports` alias for schema resolution (`#co/schema/manifest`).
    - Add `prepack` script to run clean + build + pack audit.
    - Ensure no `postinstall` or other install hooks are added to the published package.
  - Verification:
    - `npm pack --json` contains only allowlisted paths plus `package.json`.

#### License file
- [x] Add LICENSE file for publication - Evidence: `LICENSE`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
  - Files: `LICENSE`
  - Acceptance:
    - `LICENSE` exists at repo root and is required by the pack audit list.

#### Clean build + pack audit
- [x] Add clean step and pack audit script - Evidence: `scripts/pack-audit.mjs`, `scripts/clean-dist.mjs`, `package.json`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.
  - Files: `scripts/pack-audit.mjs` (new), `scripts/clean-dist.mjs` (new or existing), `package.json`
  - Acceptance:
    - Pack audit parses `npm pack --json` and fails on forbidden prefixes (`.agent/`, `docs/`, `tasks/`, `.runs/`, `out/`, `archives/`, `scripts/`, `tests/`, `evaluation/`, `adapters/`, `.github/`).
    - Pack audit rejects dist test artifacts (`dist/**/tests/**`, `dist/**/*.test.*`, `dist/**/*.spec.*`).
    - Required files must be present (`dist/bin/codex-orchestrator.js`, `schemas/manifest.json`, `README.md`, `LICENSE`).
    - Optional tarball size budget enforcement is configurable.
  - Verification:
    - `npm run pack:audit` passes locally.

#### Tighten dist allowlist
- [x] Tighten pack audit dist allowlist to runtime subtrees - Evidence: `scripts/pack-audit.mjs`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.
  - Files: `scripts/pack-audit.mjs`
  - Acceptance:
    - Dist allowlist is limited to runtime subtrees (e.g., `dist/bin/**`, `dist/orchestrator/**`, `dist/packages/**`, `dist/scripts/design/pipeline/**`, `dist/types/**`).
    - Pack audit fails if `dist/patterns/**` or other non-runtime output appears in the tarball.

#### Pack smoke test
- [x] Add pack smoke test for the tarball - Evidence: `scripts/pack-smoke.mjs`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-23-421Z-7c7bab9e/manifest.json`.
  - Files: `scripts/pack-smoke.mjs` (new), `package.json`
  - Acceptance:
    - Installs the packed `.tgz` into a temp dir.
    - Runs `codex-orchestrator --help`, `codex-orchestrator --version`, and `codex-orchestrator self-check --format json` successfully.
    - Uses `npm install` in a temp directory (CI-only network use).
  - Verification:
    - `npm run pack:smoke` passes locally.

#### CI pack audit gate
- [x] Add CI gate for pack audit and smoke test - Evidence: `.github/workflows/release.yml`.
  - Files: `.github/workflows/release.yml`
  - Acceptance:
    - CI runs `npm run pack:audit` and pack smoke test for release/tag flows.
    - Failure blocks publish.
    - Release workflow cleans `dist/` before build to avoid stale artifacts.

### Schema Resolution & Runtime Assets

#### Schema resolution independent of package name
- [x] Implement Pattern A resolver with fallback - Evidence: code + tests.
  - Files: `packages/shared/manifest/validator.ts` (or new resolver), `package.json`, tests
  - Acceptance:
    - `createRequire(import.meta.url).resolve("#co/schema/manifest")` works when `imports` exists.
    - Fallback walks to package root and resolves `schemas/manifest.json` when `imports` is missing.
    - Tests cover both resolution paths.

#### Schema asset packaging
- [x] Ensure `schemas/manifest.json` is shipped and validated - Evidence: `schemas/manifest.json`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.
  - Files: `schemas/manifest.json`, pack audit rules
  - Acceptance:
    - Pack audit requires `schemas/manifest.json`.
    - Validator tests load schema from packaged path.

### CLI Companion Surface

#### MCP server command
- [x] Add `codex-orchestrator mcp serve` - Evidence: CLI implementation + tests.
  - Files: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/**`
  - Acceptance:
    - MCP protocol output goes to stdout only; orchestrator logs go to stderr only.
    - `codex mcp add <name> -- codex-orchestrator mcp serve` works with stdio.
    - No stdout logging in MCP path.

#### MCP stdout/stderr enforcement (delegated)
- [x] Enforce or verify downstream `codex` stdout stays protocol-only when `mcp serve` delegates.
  - Files: `orchestrator/src/cli/mcp.ts`, tests, docs
  - Acceptance:
    - Wrapper or integration test proves no downstream logs leak to stdout.
    - README and docs call out the dependency if full enforcement is not possible.

#### Migrate MCP scripts to CLI
- [x] Replace user-facing MCP scripts with CLI subcommands - Evidence: CLI + docs updates.
  - Files: `scripts/run-local-mcp.sh`, `scripts/run-mcp-diagnostics.sh`, `scripts/mcp-runner-*.{sh,js}`, `scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-migrate.js`, `mcp-client.json`, `README.md`
  - Acceptance:
    - References to MCP scripts are replaced with `codex-orchestrator` subcommands.
    - `mcp-client.json` template (if shipped) points to CLI, not `scripts/**`.
    - Pack audit forbids `scripts/**` in the tarball.

#### Self-check command
- [x] Add `codex-orchestrator self-check --format json` - Evidence: CLI implementation + tests.
  - Files: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/selfCheck.ts` (new)
  - Acceptance:
    - Returns machine-readable JSON for smoke tests.
    - Safe to run in any repo (no writes except under configured run dir).

#### Version flag
- [x] Add `codex-orchestrator --version` output - Evidence: CLI implementation + tests.
  - Files: `bin/codex-orchestrator.ts`
  - Acceptance:
    - Prints the package version and exits with status 0.

#### CLI build fidelity
- [x] Verify shebang preservation and ESM consistency - Evidence: tests.
  - Files: `bin/codex-orchestrator.ts`, build tests
  - Acceptance:
    - `dist/bin/codex-orchestrator.js` starts with `#!/usr/bin/env node`.
    - ESM imports resolve under NodeNext without CJS fallback.

#### Output location safety
- [x] Enforce user-controlled run dirs for all CLI outputs - Evidence: code review + tests.
  - Files: `orchestrator/src/cli/run/**`, `orchestrator/src/learning/**`
  - Acceptance:
    - No writes to `node_modules` or package install dir.
    - All outputs route through configured `runsRoot` or user-provided paths.

#### Telemetry default-off
- [x] Ensure telemetry/network calls are disabled by default - Evidence: tests.
  - Files: `orchestrator/src/**`, `packages/shared/**`
  - Acceptance:
    - No network calls unless explicitly enabled.
    - `self-check` and `doctor` do not initiate network activity.

### Templates & Init

#### Templates packaging
- [x] Add `templates/` with README disclaimer + version markers - Evidence: new templates.
  - Files: `templates/README.md`, `templates/**`
  - Acceptance:
    - README states templates are examples, may change without semver, and are not auto-loaded.
    - Each template includes `templateVersion` marker or header.
    - Pack audit allowlist includes `templates/**`.

#### Init behavior
- [x] Add `codex-orchestrator init codex` - Evidence: CLI implementation + tests.
  - Files: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/init.ts` (new), `templates/**`
  - Acceptance:
    - Non-overwrite by default; `--force` required to overwrite.
    - Prints list of files written.
    - No postinstall hooks.

### Optional Dependencies + Doctor

#### Optional peer deps + loader
- [x] Move Playwright-class deps to optional peer deps and add dynamic loader - Evidence: package metadata + tests.
  - Files: `package.json`, `scripts/design/pipeline/optionalDeps.ts`, `packages/shared/**`
  - Acceptance:
    - Optional loader resolves from CWD first, then from the package.
    - Clear error message with install instructions when missing.
    - Dynamic import used (no eager require).

#### Doctor command
- [x] Add `codex-orchestrator doctor` - Evidence: CLI implementation + tests.
  - Files: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/doctor.ts` (new)
  - Acceptance:
    - Reports missing optional deps and exact install commands.
    - No installs without explicit confirmation.

### Release Workflow

#### Tag-driven release + immutable artifact
- [x] Add tag-driven release workflow - Evidence: workflow + release run.
  - Files: `.github/workflows/release.yml`, `package.json`
  - Acceptance:
    - Tag `vX.Y.Z` or `vX.Y.Z-alpha.N` required; tag version equals `package.json` version.
    - Stable tags publish with `dist-tag latest`; alpha tags publish with `dist-tag alpha` and GitHub prerelease.
    - Publish uses tarball attached to GitHub Release.
    - Prefer npm trusted publishing (OIDC) and provenance when supported.

#### Release portability docs
- [x] Document release asset download fallbacks - Evidence: spec update.
  - Files: `docs/TECH_SPEC-npm-companion-package-publishability.md`, `README.md`
  - Acceptance:
    - Preferred `gh release download` with retries and required permissions documented.
    - Fallback via `actions/github-script` + `curl` with `Accept: application/octet-stream` documented.
    - Last-resort `actions/upload-artifact` / `actions/download-artifact` documented.

#### README update
- [x] Update README with companion package usage and release flow - Evidence: README change + manifest.
  - Files: `README.md`
  - Acceptance:
    - Include MCP registration command.
    - Include `init` + templates disclaimer summary.
    - Include release flow summary and dist-tag behavior.

### Guardrails & Handoff (post-implementation)
- [x] `npm run review` is non-interactive in CI (flag/env enforced; fails fast on prompts).
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run build` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run lint` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run test` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run docs:check` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
