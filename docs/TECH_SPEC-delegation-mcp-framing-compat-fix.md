# Technical Spec - Delegation MCP Framing Compatibility Fix (Task 0944)

## Overview
- Objective: Make delegation MCP respond in JSONL when requests arrive as JSONL over stdio, while keeping Content-Length framing for framed requests.
- In Scope: Request framing detection, response framing selection, tests for JSONL response behavior, patch release 0.1.6.
- Out of Scope: Feature expansion or config default changes.

## Architecture & Design
### Current State
- Codex CLI MCP client sends JSONL over stdio (no Content-Length headers).
- Delegation MCP server parses JSONL but always responds using Content-Length framing, causing the client to fail parsing (serde error at column 1).

### Proposed Changes
- Track framing per request during parsing:
  - JSONL line -> JSONL response (`JSON.stringify(response) + "\n"`).
  - Content-Length framed -> framed response (existing behavior).
- Maintain compatibility for hybrid scenarios by selecting the response mode per message, not as a global connection default.

### Error Handling
- JSON parse errors still log and continue as today.
- Protocol violations still halt the server as it does today.

### Data Persistence / State Impact
- None.

## Operational Considerations
- Failure Modes:
- Incorrect response framing could regress framed clients; tests must cover both JSONL and framed paths.
- Observability:
- Test coverage in `orchestrator/tests/DelegationServer.test.ts` for JSONL responses.
- Security / Privacy:
- No new surface area; same request validation.

## Testing Strategy
- Unit / Integration:
- JSONL request -> JSONL response assertions.
- Existing framed request tests remain (Content-Length framing).
- Release Validation (per release SOP): build/lint/test/docs/diff-budget/review, plus pack audit + smoke.

## Rollback Plan
- If compatibility regressions are found, release a follow-up patch and revert response framing change.

## Documentation & Evidence
- Linked PRD: `docs/PRD-delegation-mcp-framing-compat-fix.md`
- Run Manifest Link: (docs-review run recorded in task checklist)
- Metrics / State Snapshots: `.runs/0944-delegation-mcp-framing-compat-fix/metrics.json`, `out/0944-delegation-mcp-framing-compat-fix/state.json`

## Open Questions
- None.

## Approvals
- Engineering: Pending
- Reviewer: Pending
