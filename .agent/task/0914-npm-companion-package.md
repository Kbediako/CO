# Task 0914 - Codex Orchestrator NPM Companion Package

- MCP Task ID: `0914-npm-companion-package`
- Primary PRD: `docs/PRD-npm-companion-package.md`
- Tech Spec: `docs/TECH_SPEC-npm-companion-package.md`
- Action Plan: `docs/ACTION_PLAN-npm-companion-package.md`
- Mini-spec: `tasks/specs/0914-npm-companion-package.md`
- Run Manifest (docs review): `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`
- Metrics/State: `.runs/0914-npm-companion-package/metrics.json`, `out/0914-npm-companion-package/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: this commit.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0914-npm-companion-package/metrics.json`, `out/0914-npm-companion-package/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0914-npm-companion-package.md`, and `tasks/index.json` - Evidence: this commit.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.

### Packaging & Tarball Controls
- [x] Update package publish metadata and allowlist - Evidence: `package.json`, `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.
- [x] Add LICENSE file for publication - Evidence: `LICENSE`, manifest.
- [x] Add clean step and pack audit script.
- [x] Tighten pack audit dist allowlist to runtime subtrees.
- [x] Add pack smoke test for the tarball - Evidence: new script + manifest.
- [x] Add CI gate for pack audit and smoke test - Evidence: workflow + manifest.

### Schema Resolution & Runtime Assets
- [x] Implement Pattern A resolver with fallback - Evidence: code + tests.
- [x] Ensure `schemas/manifest.json` is shipped and validated - Evidence: pack audit + tests.

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
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T15-23-51-418Z-e9ac2499/manifest.json`.
- [x] `npm run build` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T15-23-51-418Z-e9ac2499/manifest.json`.
- [x] `npm run lint` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T15-23-51-418Z-e9ac2499/manifest.json`.
- [x] `npm run test` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T15-23-51-418Z-e9ac2499/manifest.json`.
- [x] `npm run docs:check` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T15-23-51-418Z-e9ac2499/manifest.json`.
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T15-23-51-418Z-e9ac2499/manifest.json`.
- [x] Diff budget override recorded (`DIFF_BUDGET_OVERRIDE_REASON`) - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T15-23-51-418Z-e9ac2499/commands/06-diff-budget.ndjson`.
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T15-23-51-418Z-e9ac2499/manifest.json`.
