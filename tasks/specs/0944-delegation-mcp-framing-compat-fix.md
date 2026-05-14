---
id: 20260112-0944-delegation-mcp-framing-compat-fix
title: Delegation MCP Framing Compatibility Fix
status: completed
relates_to: tasks/tasks-0944-delegation-mcp-framing-compat-fix.md
risk: medium
owners:
  - Codex
last_review: 2026-05-14
review_notes:
  - 2026-05-14: CO-530 current-head root-cause reclassification verified this January delegation release packet is completed from checked tag/publish evidence and archived it out of active docs freshness lifecycle debt; no implementation scope reopened.
---
## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| docs freshness | Completed release task spec remained active in freshness/spec guard metadata after release closeout | remove fallback | CO-530 | May 14 current-head reclassification of recurring January release packet freshness debt | 2026-01-12 | N/A after removal | N/A after removal | Spec frontmatter is terminal and registry row is archived as historical metadata | `node scripts/spec-guard.mjs`; `npm run docs:freshness -- --warn`; `node scripts/docs-freshness-maintain.mjs --check --format json --warn` |


## Summary
- Objective: Ensure delegation MCP responds with JSONL when the Codex MCP client sends JSONL over stdio.
- Constraints: Preserve Content-Length framed responses for framed clients; avoid changing defaults or adding dependencies.

## Proposed Changes
- Track framing per request in `runJsonRpcServer` and emit JSONL responses for JSONL requests.
- Extend MCP framing tests to assert JSONL response behavior.
- Release a patch (0.1.6) with updated release notes.

## Impact Assessment
- User impact: Delegation MCP starts successfully in Codex CLI JSONL mode.
- Operational risk: medium (protocol compatibility); mitigated via tests for both JSONL and framed paths.
- Security / privacy: no new risk; same validation and token handling.

## Rollout Plan
- Validate via unit tests and a real `codex exec` MCP handshake run.
- Ship patch release 0.1.6 with standard release guardrails.

## Definition of Done
- JSONL request -> JSONL response behavior verified by tests.
- Framed request -> framed response behavior unchanged.
- Patch release 0.1.6 published with passing pack audit + smoke.
- Mirrors updated with manifests and release links.
