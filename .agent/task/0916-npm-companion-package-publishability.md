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
- [x] Update package publish metadata and allowlist - Evidence: `package.json`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] Add LICENSE file for publication - Evidence: `LICENSE`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] Add clean step and pack audit script - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.
- [x] Tighten pack audit dist allowlist to runtime subtrees - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.
- [x] Add pack smoke test for the tarball - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-23-421Z-7c7bab9e/manifest.json`.
- [x] Add CI gate for pack audit and smoke test - Evidence: `.github/workflows/release.yml`.

### Schema Resolution & Runtime Assets
- [x] Implement Pattern A resolver with fallback - Evidence: code + tests.
- [x] Ensure `schemas/manifest.json` is shipped and validated - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.

### CLI Companion Surface
- [x] Add `codex-orchestrator mcp serve`.
- [x] Enforce or verify downstream `codex` stdout stays protocol-only for `mcp serve`.
- [x] Replace user-facing MCP scripts with CLI subcommands - Evidence: CLI + docs updates.
- [x] Add `codex-orchestrator self-check --format json` - Evidence: CLI implementation + tests.
- [x] Add `codex-orchestrator --version` output - Evidence: CLI implementation + tests.
- [x] Verify shebang preservation and ESM consistency - Evidence: tests.
- [x] Enforce user-controlled run dirs for all CLI outputs - Evidence: code review + tests.
- [x] Ensure telemetry/network calls are disabled by default - Evidence: tests.

### Templates & Init
- [x] Add `templates/` with README disclaimer + version markers - Evidence: new templates.
- [x] Add `codex-orchestrator init codex` - Evidence: CLI implementation + tests.

### Optional Dependencies + Doctor
- [x] Move Playwright-class deps to optional peer deps and add dynamic loader - Evidence: package metadata + tests.
- [x] Add `codex-orchestrator doctor` - Evidence: CLI implementation + tests.

### Release Workflow
- [x] Add tag-driven release workflow - Evidence: workflow + release run.
- [x] Document release asset download fallbacks - Evidence: spec update.
- [x] Update README with companion package usage and release flow - Evidence: README change + manifest.

### Guardrails & Handoff (post-implementation)
- [x] `npm run review` is non-interactive in CI (flag/env enforced; fails fast on prompts).
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run build` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run lint` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run test` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run docs:check` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
