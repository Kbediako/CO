# PRD - Codex Orchestrator NPM Companion Package Publishability (Task 0916)

## Summary
- Problem Statement: The repository needs a documented, repeatable path to publish a single npm package without leaking dev/test/internal artifacts while preserving the companion CLI surface for Codex and CI users.
- Desired Outcome: Ship a sterile tarball (runtime-only) with explicit MCP/CLI commands, safe template scaffolding, and release guardrails that publish from immutable artifacts.

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
- Shipping internal `.agent/**`, `docs/**`, `tasks/**`, or `scripts/**` content in the npm tarball.
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
- Runtime depends on `schemas/manifest.json`; the tarball must ship `schemas/**` and resolve schema paths without relying on the package name.
- Build output required at runtime lives under `dist/bin/`, `dist/orchestrator/`, `dist/packages/`, `dist/scripts/design/pipeline/`, and `dist/types/`; other dist subtrees (for example `dist/patterns/`) must be excluded.
- MCP usage relies on CLI entrypoints; user-facing MCP scripts in `scripts/` must remain internal and unshipped.
- Module system is ESM (`type: module`) with NodeNext resolution; dist/bin must preserve the shebang.

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-npm-companion-package-publishability.md`
- Action Plan: `docs/ACTION_PLAN-npm-companion-package-publishability.md`
- Task checklist: `tasks/tasks-0916-npm-companion-package-publishability.md`
- Mini-spec: `tasks/specs/0916-npm-companion-package-publishability.md`
- Run Manifest (docs review): `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-40-22-001Z-96dbf5f0/manifest.json`
- Metrics / State Snapshots: `.runs/0916-npm-companion-package-publishability/metrics.json`, `out/0916-npm-companion-package-publishability/state.json`

## Decisions
- Package name remains `@kbediako/codex-orchestrator` (unscoped name unavailable for publish).

## Open Questions
- Minimum template set for v1 (what must ship vs follow-up release)?
- Do we enforce a hard tarball size budget or start with a warning-only audit?

## Approvals
- Product: approved (2025-12-29)
- Engineering: approved (2025-12-29)
- Design: N/A
