# Technical Spec - DevTools Readiness + Orchestrator Usage Discipline (Task 0917)

Source of truth for requirements: `tasks/specs/0917-devtools-readiness-orchestrator-usage.md`.

## Overview
- Objective: Make DevTools setup reliable for npm users and enforce a consistent orchestrator-first workflow for top-level agents.
- In Scope:
  - DevTools readiness detection (skills + MCP configuration) and explicit setup guidance.
  - Optional CLI helper for DevTools setup with confirmation gates.
  - SOP and agent doc updates that require orchestrator usage + subagent delegation for scoped work.
- Out of Scope:
  - Bundling DevTools MCP or browser binaries into the package.
  - Auto-enabling DevTools or altering default pipeline behavior.
  - Rewriting orchestrator pipelines unrelated to readiness or SOPs.

## Architecture & Design
### Current State
- `codex-orchestrator doctor` checks DevTools skill + MCP config presence (no live MCP handshake).
- DevTools enablement is driven by `CODEX_REVIEW_DEVTOOLS=1` and `codex -c 'mcp_servers.chrome-devtools.enabled=true'`.
- The npm package relies on external Codex MCP configuration and skills under `~/.codex/skills`.
- Top-level orchestrator behavior is guided but not explicitly required to use orchestrator pipelines and subagents.

### Proposed Changes
#### DevTools readiness checks
- Extend `doctor` to:
  - Detect the DevTools skill and MCP config entry.
  - Detect Codex MCP server configuration for `chrome-devtools`.
  - Report readiness states: `ok`, `missing-skill`, `missing-config`, or `missing-both` with actionable steps.
- Config detection strategy:
  - Prefer `CODEX_HOME` when set; otherwise default to `~/.codex/`.
  - Read `config.toml` when present and search for the `mcp_servers.chrome-devtools` entry.
  - If config parsing fails, surface a warning in `doctor` and treat devtools-enabled runs as not ready until config is fixed.

#### Explicit setup helper
- Add a `codex-orchestrator devtools setup` (or `doctor --setup`) command that:
  - Prints the exact `codex mcp add` command and config snippet.
  - Requires explicit confirmation before any config write or CLI invocation.
  - Supports non-interactive automation via flags (for example `--yes`), while defaulting to no changes.
- The helper should never run installs or writes without explicit confirmation.
  - Example command: `codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --categoryEmulation --categoryPerformance --categoryNetwork`.

#### DevTools pipeline preflight
- Add a preflight check for devtools-enabled pipelines (`frontend-testing-devtools`, `implementation-gate-devtools`) that:
  - Fails fast with an actionable error if DevTools readiness is missing.
  - Avoids attempting to spawn Codex with an invalid MCP config.
  - Does not fall back to non-DevTools runs.

#### Orchestrator usage discipline
- Update SOPs and agent docs to require:
  - Orchestrator pipelines for planning, implementation, review, and evidence capture.
  - Subagent delegation for scoped investigation, file discovery, and research to preserve context.
  - Explicit checklist updates after each subtask.
- Provide a concise decision rubric (when direct commands are acceptable vs when the orchestrator must be used).

## Data Persistence / State Impact
- No manifest schema changes required.
- Readiness state is reported in `doctor` output and CLI log messages.

## External Dependencies
- Codex CLI with MCP support.
- DevTools MCP server and skill (`chrome-devtools`) installed externally.

## Operational Considerations
- Failure Modes:
  - Missing MCP config with skill present.
  - Config file parse failure or unexpected format.
  - DevTools command invoked in non-interactive environments without confirmation.
- Observability & Telemetry:
  - Log readiness diagnostics to stderr; emit JSON only when `--format json` is set.
- Security / Privacy:
  - No automatic config mutation without confirmation.
  - No background network calls or telemetry.

## Testing Strategy
- Unit / Integration:
  - Extend `orchestrator/tests/Doctor.test.ts` to cover config detection and readiness states.
  - Add CLI tests for the devtools setup helper, including non-interactive `--yes` flow.
  - Add pipeline tests verifying devtools preflight behavior (fail with clear message when missing).
- Tooling / Automation:
  - Add fixture config files under the existing `tests/` directory to simulate MCP config states.
  - Ensure tests do not depend on actual `~/.codex` contents.
- Rollback Plan:
  - Revert readiness detection and setup helper; keep existing skill-only detection.

## Documentation & Evidence
- Linked PRD: `docs/PRD-devtools-readiness-orchestrator-usage.md`
- Run Manifest (docs review): `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T22-15-44-073Z-e5467cda/manifest.json`
- Metrics / State Snapshots: `.runs/0917-devtools-readiness-orchestrator-usage/metrics.json`, `out/0917-devtools-readiness-orchestrator-usage/state.json`

## Open Questions
- None. Use `~/.codex/config.toml` (or `CODEX_HOME/config.toml`) as the canonical Codex config, and hard-fail devtools-enabled runs when readiness is missing.

## Approvals
- Engineering: Pending
- Reviewer: Pending
