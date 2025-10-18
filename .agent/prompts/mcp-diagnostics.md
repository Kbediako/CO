# MCP Diagnostics Prompt

Use this when you need Codex to run the standard repo checks through the local MCP harness.

```
Follow the Local MCP Harness Quickstart in .agent/readme.md. The harness already creates the manifest and directories, so run the CLI commands below exactly as written—one at a time—and wait for each JSON reply before starting the next command.

npx --yes @wong2/mcp-cli --config ./mcp-client.json call-tool codex-local:codex --args '{"approval_policy":"never","prompt":"Run npm run build and record the output in the current MCP run manifest. Reply only when the command finishes."}'
npx --yes @wong2/mcp-cli --config ./mcp-client.json call-tool codex-local:codex --args '{"approval_policy":"never","prompt":"Run npm run lint and record the output in the current MCP run manifest. Reply only when the command finishes."}'
npx --yes @wong2/mcp-cli --config ./mcp-client.json call-tool codex-local:codex --args '{"approval_policy":"never","prompt":"Run npm run test and record the output in the current MCP run manifest. Reply only when the command finishes."}'
npx --yes @wong2/mcp-cli --config ./mcp-client.json call-tool codex-local:codex --args '{"approval_policy":"never","prompt":"Run bash scripts/spec-guard.sh --dry-run and record the output in the current MCP run manifest. Reply only when the command finishes."}'

After all four commands finish, read the latest .runs/local-mcp/<timestamp>/manifest.json, summarize pass/fail status, and report the manifest path. Do not run additional pre-check commands like ls or grep before the sequence; the harness manages manifests automatically.
```
