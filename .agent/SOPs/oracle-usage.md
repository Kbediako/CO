# SOP - Oracle + Chrome DevTools Usage

## Goal
Standardize Oracle runs (browser mode) with reliable file batching, unique filenames, and Chrome DevTools observability.

## Oracle run rules (must follow)
1) Max 4 files per Oracle run. Do not exceed four `--file` entries.
2) Do not upload files with duplicate basenames (e.g., two `manifest.json`).
3) Keep the Chrome window open until Oracle completes. Closing it ends the run.

## Preflight checklist
- Run once per session: `npx -y @steipete/oracle --help`.
- Dry-run to confirm file count + sizes:
  - `npx -y @steipete/oracle --dry-run summary --files-report -p "<prompt>" --file "<path1>" --file "<path2>"`

## Batching strategy (4-file max)
- If you need more than 4 files, split into multiple runs and label them clearly with `--slug`.
- If basenames collide (e.g., `manifest.json`), copy and rename to a temp directory:
  - `mkdir -p /tmp/oracle-batch`
  - `cp path/a/manifest.json /tmp/oracle-batch/manifest-run-a.json`
  - `cp path/b/manifest.json /tmp/oracle-batch/manifest-run-b.json`

## Canonical Oracle command (browser mode)
```
npx -y @steipete/oracle --engine browser --model gpt-5.2-pro \
  --browser-cookie-wait 5 \
  --slug "<short-slug>" \
  -p "<prompt>" \
  --file "<file1>" \
  --file "<file2>" \
  --file "<file3>" \
  --file "<file4>"
```

## Session recovery
- List sessions: `npx -y @steipete/oracle status --hours 24`
- Reattach: `npx -y @steipete/oracle session <id> --render`

## Chrome DevTools observability
### Readiness
- Check readiness: `codex-orchestrator doctor --format json`
- If missing, configure the MCP server:
  - `codex-orchestrator devtools setup`
  - Or: `codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --categoryEmulation --categoryPerformance --categoryNetwork`

### Headless devtools-enabled orchestrator run (baseline)
Use this to validate DevTools enablement in CI-like conditions:
```
CODEX_NON_INTERACTIVE=1 CODEX_REVIEW_DEVTOOLS=1 \
  MCP_RUNNER_TASK_ID=<task-id> \
  npx codex-orchestrator start frontend-testing --format json --no-interactive
```

### Inspect Oracle browser sessions
When Oracle opens Chrome, use the Chrome DevTools MCP tooling to:
- list pages, select the Oracle window, and capture console + network errors
- take a screenshot for evidence

Suggested MCP flow (tool names only):
1) list_pages
2) select_page
3) list_console_messages
4) list_network_requests
5) take_screenshot

## Notes
- Always keep Oracle runs to 4 files max, and avoid duplicate basenames.
- Use `--render --copy` for manual paste if browser runs fail repeatedly.
