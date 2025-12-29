# PRD - Codex Orchestrator NPM Companion Package (Task 0914)

## Summary
- Problem Statement: The current repository cannot be safely published as a single npm package. It contains dev/test/internal artifacts, relies on repo-local scripts for MCP usage, and lacks a pack audit gate, so a publish could leak internal directories or omit runtime assets.
- Desired Outcome: Make Codex Orchestrator publishable as a single "companion/plugin" npm package with a sterile tarball (only runtime assets), explicit CLI entrypoints for MCP and scaffolding, and release guardrails that prevent artifact leakage.

## Goals
- Publish a sterile tarball that ships only runtime dist subtrees (`dist/bin/**`, `dist/orchestrator/**`, `dist/packages/**`, `dist/scripts/design/pipeline/**`, `dist/types/**`), `schemas/**`, optional `templates/**`, plus `README.md` and `LICENSE`.
- Provide a first-class MCP server command (`codex-orchestrator mcp serve`) that Codex can register via stdio.
- Provide an explicit `codex-orchestrator init codex` scaffolder that copies templates into a user repo (no `.agent/**` shipped in the tarball).
- Ensure schema resolution is independent of package name and covered by tests.
- Add a prepack pipeline (clean + build + pack audit) plus CI pack audit gate and smoke test of the packed tarball.
- Adopt a tag-driven release workflow (stable vs alpha) with immutable artifacts and provenance where feasible.
- Make heavy optional dependencies (Playwright-class) optional peer deps with dynamic import + a `doctor` command.
- Preserve CLI safety requirements: shebang preserved, ESM/NodeNext consistency, MCP stdout-only protocol, telemetry default-off, and no writes into `node_modules`.

## Non-Goals
- Rewriting orchestrator pipelines beyond packaging and CLI entrypoint work.
- Changing manifest schema content beyond resolution and packaging updates.
- Shipping internal `.agent/**`, `docs/**`, `tasks/**`, or `scripts/**` content inside the npm package.
- Adding background network calls or postinstall hooks.

## Stakeholders
- Product: Platform enablement
- Engineering: Orchestrator maintainers
- Design: N/A (CLI/runtime scope)

## Metrics & Guardrails
- Primary Success Metrics:
  - `npm pack --json` output includes only allowlisted files and required runtime assets.
  - Pack smoke test passes (`--help`, `--version`, `self-check`).
  - MCP server emits protocol traffic to stdout only; logs go to stderr (if delegating to `codex`, enforce or verify downstream stdout stays protocol-only).
  - `init` copies templates only when explicitly invoked; no overwrite without `--force`.
- Guardrails / Error Budgets:
  - No postinstall hooks; no network calls unless enabled.
  - Node >= 20 and ESM NodeNext semantics remain consistent across build output.
  - Commands never write to `node_modules` or package root; use user-controlled run dirs.
  - Review handoff (`npm run review`) remains non-interactive in CI; add a guard/flag if the Codex CLI can prompt.

## User Experience
- Personas:
  - Codex users registering an MCP server for local automation.
  - CI/CD operators installing the companion package for diagnostics and releases.
- User Journeys:
  - Install the package and run `codex-orchestrator mcp serve`, then register with `codex mcp add ... -- <stdio command>`.
  - Run `codex-orchestrator init codex` to scaffold templates into a repo on demand.
  - Run `codex-orchestrator doctor` to validate optional deps and get exact install instructions.

## Technical Considerations
- Runtime currently depends on `schemas/manifest.json` and a manual scenario template under `.agent/task/templates/`; packaging must include schemas and provide templates under `templates/` with explicit init.
- MCP usage today relies on scripts in `scripts/` (e.g., `run-local-mcp.sh`); these must become CLI subcommands and remain outside the published tarball.
- The module system is ESM (`type: module`) with NodeNext resolution; dist/bin currently preserves the shebang and must continue to do so.

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-npm-companion-package.md`
- Action Plan: `docs/ACTION_PLAN-npm-companion-package.md`
- Task checklist: `tasks/tasks-0914-npm-companion-package.md`
- Mini-spec: `tasks/specs/0914-npm-companion-package.md`
- Run Manifest (docs review): `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`
- Metrics / State Snapshots: `.runs/0914-npm-companion-package/metrics.json`, `out/0914-npm-companion-package/state.json`

## Decisions
- Package name: `@kbediako/codex-orchestrator` (unscoped name unavailable for publish).

## Open Questions
- Minimum template set for v1 (what must ship vs follow-up release)?
- Do we expose additional MCP subcommands beyond `serve` and `self-check`?
- Decision: publish under a proprietary license (see `LICENSE`); confirm legal approval before public release.

## Approvals
- Product: approved (2025-12-28)
- Engineering: approved (2025-12-28)
- Design: N/A
