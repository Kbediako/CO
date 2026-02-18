# PRD - Codex Collab Orchestrator Integration

## Summary
- Problem Statement: Codex CLI v0.88.0 introduces collab/multi-agent collaboration modes, but the CO orchestrator does not yet surface or leverage these capabilities for pipelines or RLM workflows. Official CLI releases also do not emit collab JSONL events, limiting CO’s ability to consume them as a plugin.
- Desired Outcome: The orchestrator can configure collaboration modes per run/stage, leverage multi-agent control where it adds value (especially RLM), capture collab activity in manifests/telemetry, publish guidance on MCP vs collab usage, and improve long-running accuracy via context-rot mitigation. CO should offer a managed, patched Codex CLI install path so official users can opt in without replacing the system binary.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Research collab multi-agent support in Codex CLI v0.88.0 and determine the updates needed to the orchestrator; include RLM impacts and whether MCP remains the best orchestration option. Enable CO init to provision a patched Codex CLI so official users can access collab JSONL without modifying their system install.
- Success criteria / acceptance: Clear plan of required changes and integration points; RLM enhancement approach; recommendation on MCP vs collab; real-world eval/test plan; docs-first artifacts created; CO-managed codex CLI install path defined.
- Constraints / non-goals: No implementation unless approved; keep compatibility with current orchestration and delegation flows; avoid breaking safety/approval behavior; avoid in-place mutation of the official Codex CLI binary by default.

## Goals
- Define an integration plan for collab modes + multi-agent control in orchestrator pipelines and RLM.
- Specify event/manifest updates to capture collab activity.
- Clarify MCP vs collab roles in the orchestration stack.
- Ensure long-running multi-hour/multi-day workflows remain accurate with context-rot mitigation.
- Provide a CO-managed installation path for a patched Codex CLI, and default to it when configured.

## Non-Goals
- Shipping a full refactor in this task.
- Changing default safety or approval policies without explicit approval.
- Deprecating MCP without an evidence-backed migration plan.
- Replacing or mutating the official Codex CLI binary in-place by default.

## Stakeholders
- Product: Orchestrator owners.
- Engineering: Orchestrator CLI + RLM maintainers.
- Design: Not applicable (CLI).

## Metrics & Guardrails
- Primary Success Metrics: collab-enabled runs configured via orchestrator; collab activity captured in manifests; RLM subcalls can run in parallel within budgets; long-running tasks maintain accuracy.
- Guardrails / Error Budgets: no regressions in existing pipelines; bounded event volume and artifacts; clean fallback to single-agent mode; no excessive context drift.

## User Experience
- Personas: Orchestrator users running pipelines; RLM operators.
- User Journeys:
  - Run a pipeline with a selected collaboration mode (plan/pair/execute) and see it recorded in run metadata.
  - RLM pipeline uses multi-agent control for subcalls/roles and records collab activity for auditability.
  - Multi-day initiative resumes with preserved decision logs and validated context snapshots.

## Technical Considerations
- Architectural Notes: collab provides multi-conversation agent control and collaboration mode overrides; orchestrator must pass config to Codex CLI and consume collab events; long-running tasks require checkpointed context and periodic validation; for official CLI users, CO should optionally install and route to a patched codex binary under a CO-managed directory.
- Dependencies / Integrations: Codex CLI v0.88.0+, app-server event stream, MCP server interface.

## Recommendation: MCP vs Collab
- Keep MCP as the orchestration backbone for cross-tool routing, approvals, external integrations, and long-running delegated runs with manifest evidence.
- Treat collab as additive for intra-run multi-agent collaboration (planning splits, RLM symbolic subcalls, subagent brainstorms) and enable it explicitly (`--enable multi_agent` / `RLM_SYMBOLIC_COLLAB=1`; `--enable collab` remains a legacy alias).
- Do not deprecate MCP until collab offers equivalent lifecycle control, audit trails, and sandbox/approval hooks; prefer CO-managed CLI installs to add collab JSONL without modifying the official CLI.

## Open Questions
- Should collab be the default for RLM symbolic subcalls or opt-in?
- What minimum event schema changes are required to capture collab tool calls?
- Can collab replace any current delegation flows, or should it be additive?
- What is the minimal viable context-rot detection strategy for multi-day runs?

## Approvals
- Product:
- Engineering:
- Design:
