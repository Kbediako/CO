# PRD - DevTools Readiness + Orchestrator Usage Discipline (0917-devtools-readiness-orchestrator-usage)

## Summary
- Problem Statement: DevTools-enabled frontend testing is shipped in the npm package, but success depends on external MCP configuration and unclear setup steps. Top-level orchestrators also lack a firm standard to use the orchestrator and subagents consistently, which risks missing manifests, approvals, and context drift.
- Desired Outcome: Provide a first-class DevTools readiness path (detect, explain, and optionally set up) and codify a standard that top-level orchestrators use orchestrator pipelines and scoped subagents for work that affects the repo, with clear evidence capture.

## Goals
- Make DevTools readiness explicit and actionable for npm users (skill + MCP config checks, clear setup instructions).
- Provide an explicit, opt-in setup helper for DevTools that never writes config without confirmation.
- Keep DevTools opt-in for runs (`--devtools` or devtools pipeline) and preserve stdout/stderr protocol rules.
- Standardize top-level orchestrator behavior: use orchestrator pipelines for planning/implementation/review and spawn subagents for scoped exploration to conserve context.
- Document the standard in SOPs and agent docs with acceptance criteria and evidence expectations.

## Non-Goals
- Bundling Chrome, DevTools MCP, or browser binaries inside the npm package.
- Auto-enabling DevTools or changing default pipeline behavior.
- Rewriting orchestrator pipeline architecture beyond readiness checks.
- Replacing the existing review gates.

## Stakeholders
- Product: Agent platform
- Engineering: Orchestrator maintainers
- Design: N/A (policy + CLI readiness)

## Metrics & Guardrails
- Primary Success Metrics:
  - `codex-orchestrator doctor` reports DevTools readiness and concrete setup steps.
  - DevTools-enabled runs either succeed or fail with explicit, actionable setup errors.
  - Top-level orchestrator SOPs require orchestrator usage + subagent delegation where appropriate.
- Guardrails / Error Budgets:
  - DevTools stays opt-in only; no background network calls.
  - No config writes without explicit confirmation.
  - MCP protocol output remains stdout-only; logs remain stderr-only.

## User Experience
- Personas:
  - Codex users running frontend testing from the npm package.
  - Top-level orchestrators coordinating multi-step work.
- User Journeys:
  - Run `codex-orchestrator doctor --format json` and see DevTools readiness + setup steps.
  - Run `codex-orchestrator devtools setup` (or equivalent) to install/configure DevTools only after explicit confirmation.
  - Run `codex-orchestrator frontend-test --devtools` or `start frontend-testing-devtools` with clear guidance if DevTools is missing.
  - Use orchestrator pipelines for docs-review, implementation-gate, and review; spawn subagents for investigation work.

## Technical Considerations
- DevTools readiness should check both the skill path and MCP server configuration.
- Config detection must respect `CODEX_HOME` and avoid destructive edits.
- A single source of truth for readiness messaging should be used by `doctor` and devtools-related commands.
- Spec Link: `tasks/specs/0917-devtools-readiness-orchestrator-usage.md`.

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-devtools-readiness-orchestrator-usage.md`
- Action Plan: `docs/ACTION_PLAN-devtools-readiness-orchestrator-usage.md`
- Task checklist: `tasks/tasks-0917-devtools-readiness-orchestrator-usage.md`
- Mini-spec: `tasks/specs/0917-devtools-readiness-orchestrator-usage.md`

## Decisions
- DevTools setup remains explicit and opt-in; no automatic configuration changes.
- DevTools-enabled runs hard-fail when readiness is missing (no fallback).
- Codex MCP configuration is detected via `CODEX_HOME/config.toml` (defaulting to `~/.codex/config.toml`) rather than invoking `codex mcp list`.

## Open Questions
- None.

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
