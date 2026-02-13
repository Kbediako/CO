---
id: 20260112-0944-delegation-mcp-framing-compat-fix
title: Delegation MCP Framing Compatibility Fix
relates_to: tasks/tasks-0944-delegation-mcp-framing-compat-fix.md
risk: medium
owners:
  - Codex
last_review: 2026-02-13
---

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
