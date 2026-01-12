# PRD - Delegation MCP Framing Compatibility Fix (Task 0944)

## Summary
- Problem Statement: Delegation MCP still fails to start with Codex CLI because the server replies with Content-Length framing even when the client uses JSONL over stdio. Codex’s MCP client expects JSONL responses for JSONL requests and errors on framed headers.
- Desired Outcome: Publish a patch release that makes the delegation MCP respond with JSONL when requests arrive as JSONL, while retaining Content-Length framing for framed inputs.

## Goals
- Ensure MCP stdio compatibility with Codex CLI JSONL framing (no handshake errors).
- Preserve existing framed request/response handling for non-JSONL clients.
- Add tests that prove JSONL request -> JSONL response behavior and mixed framing resilience.
- Ship a patch release (0.1.6) with updated release notes and validation evidence.

## Non-Goals
- Adding new delegation features or expanding the tool surface.
- Changing external configuration defaults (delegation remains disabled by default).
- Altering packaging allowlist or release workflow semantics.

## Stakeholders
- Product: Codex Orchestrator Platform
- Engineering: Orchestrator Core + Autonomy
- Release: Maintainers

## Metrics & Guardrails
- Primary Success Metrics:
- Delegation MCP initializes successfully under Codex CLI JSONL stdio (no framing errors).
- Patch release 0.1.6 published with passing pack audit + smoke tests.
- Guardrails:
- Keep MCP framing behavior backward compatible for Content-Length framed clients.
- Delegation features remain opt-in via config flags.

## User Experience
- Personas:
  - Operators enabling delegation MCP in Codex CLI.
- User Journeys:
- Enable delegation MCP and call delegate tools without startup failure.

## Technical Considerations
- Delegation MCP server will emit JSONL responses when requests were JSONL.
- Existing Content-Length framed responses remain for framed inputs.
- No new dependencies expected.

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-delegation-mcp-framing-compat-fix.md`
- Action Plan: `docs/ACTION_PLAN-delegation-mcp-framing-compat-fix.md`
- Task checklist: `tasks/tasks-0944-delegation-mcp-framing-compat-fix.md`
- Run Manifest Link: (docs-review run recorded in task checklist)

## Open Questions
- None.

## Approvals
- Product: Pending
- Engineering: Pending
- Release: Pending
