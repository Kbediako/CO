---
name: chrome-devtools
description: Control and inspect Chrome via the Chrome DevTools MCP server (navigate, interact, screenshots, console, network, perf).
allowed-tools: mcp__chrome-devtools__*
---

# Chrome DevTools (MCP)

Use this skill when you need browser-grounded evidence (UI screenshots, console errors, network failures, perf traces) or when a task requires real page interaction.

## Preflight

- Ensure the MCP server is configured: `codex-orchestrator devtools setup --yes`.
- If tools are missing in the current run, enable the server and restart the run:
  - `codex -c 'mcp_servers.chrome-devtools.enabled=true' ...`

## Default Workflow

1. Open a new page and navigate to the target URL.
2. Wait for the page to be stable (avoid racing async renders).
3. Interact with the UI (click/fill/press) to reproduce the behavior.
4. Collect evidence:
   - Screenshot(s) for visual state
   - Console messages for runtime errors
   - Network requests for failed/slow calls
5. Close pages when finished.

## Evidence Discipline

- Always capture at least one screenshot when validating UI behavior.
- When debugging, always include:
  - `list_console_messages`
  - `list_network_requests` (and fetch details for failures)

