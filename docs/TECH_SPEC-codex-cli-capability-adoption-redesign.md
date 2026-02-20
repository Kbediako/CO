# TECH_SPEC - Codex CLI Capability Adoption + Low-Friction Downstream Reliability (0975)

- Objective: land additive reliability and UX fixes that increase practical Codex CLI adoption in downstream repos.
- Scope: package/template config availability, command help consistency, delegation repo pin behavior, fallback-visibility signaling, downstream issue logging workflow, and scenario/observability test mandates.
- Canonical TECH_SPEC: `tasks/specs/0975-codex-cli-capability-adoption-redesign.md`.

## Requirements
- Ensure bootstrap-first usage is explicit (`init/setup` writes repo config), with packaged fallback retained for compatibility only.
- Ensure `init codex` installs downstream `codex.orchestrator.json` template.
- Ensure `start --help`, `init --help`, and `plan --help` return usage without execution side effects.
- Ensure `delegation setup --repo <path>` preserves repo pin in planned/applied `codex mcp add` invocation.
- Intake and track tower-defence field reports (CO-001..CO-004) for upstream fixes.
- Ensure fallback usage (config fallback, cloud fallback) is explicitly surfaced in operator/agent-visible outputs.
- Add a reproducible issue bundle workflow (`doctor --issue-log`) so downstream agents can log failures quickly with artifact context.
- Add opt-in automatic issue logging on run failures (`start`/`flow`) so downstream users can dogfood failure reporting with near-zero friction.
- Add strict no-fallback repo-config mode for fail-fast lanes while keeping compatibility defaults for existing users.
- Centralize command-preview shell quoting helper usage across setup surfaces.
- Add scenario-based user-flow tests in dummy repos and observability contract assertions for status/manifest payloads.
- Harden standalone review wrapper behavior to fail fast on delegation-startup loops with actionable diagnostics.
- Default standalone review manifest selection to the active task env when `--task` is not passed.
- Add optional automatic issue-bundle capture on standalone review failure paths.
- Keep delegation MCP enabled by default for `npm run review` wrapper executions, with explicit disable controls for targeted troubleshooting.
- Make wrapper timeout/stall/startup-loop guards opt-in (unbounded runtime by default).
- Add patience-first monitor checkpoints for long-running wrapper review waits so agents can see elapsed/idle progress without enforcing default runtime caps.
- Validate direct `codex review --uncommitted` startup-loop behavior in at least one simulated/mock repo before classifying the issue as repo-specific or CLI-wide.
- Add large-scope uncommitted review preflight/advisory in the wrapper so CO-sized diffs are explicitly detected, logged, and prompt-scoped for faster high-signal findings.
- Remove reliance on delegation-disabled review defaults; keep delegation available by default and support explicit disable controls for targeted troubleshooting.
- Keep behavior backward-compatible and documented.

## Validation
- Targeted tests for init/help/delegation behavior and command surface.
- Targeted tests for fallback visibility and issue-bundle generation.
- Scenario-style fixture tests (real-user flow simulation) for setup/execution/failure/observability.
- Manual downstream smoke in an isolated fixture clone.
- Required guardrail and repo-wide checks before handoff.

## Approvals
- User approved direction on 2026-02-19.
