# SOP - Oracle + Chrome DevTools Usage

## Goal
Standardize Oracle runs (browser mode) with reliable file batching, unique filenames, and Chrome DevTools observability.

## Oracle run rules (must follow)
1) Max 4 files per Oracle run. Do not exceed four `--file` entries.
2) Do not upload files with duplicate basenames (e.g., two `manifest.json`).
3) Keep the Chrome window open until Oracle completes. Closing it ends the run.
4) Prefer uploads: `--browser-attachments always`; if uploads fail, use inline or `--render --copy` and paste manually.

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

## Uploads + fallback
- Default to attachments with `--browser-attachments always`.
- If uploads fail or are blocked, use inline (`--browser-inline-files` or `--browser-attachments never`).
- If inline is too large, use `--render --copy` and paste manually.
- Hard inline cap: 255k chars. Recommend <=200k chars for safety. 256k+ fails with ChatGPT “message too long”.
- Troubleshooting: if DevTools opens a non-Oracle tab, use list/select to target the ChatGPT tab.

## Canonical Oracle command (browser mode)
```
npx -y @steipete/oracle --engine browser --model gpt-5.2-pro \
  --browser-port 9222 \
  --browser-cookie-wait 5 \
  --browser-attachments always \
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
  - Add an Oracle-specific MCP entry (leave the global one untouched):
    - `codex mcp add chrome-devtools-oracle -- npx -y chrome-devtools-mcp@latest --browserUrl http://127.0.0.1:9222 --categoryEmulation --categoryPerformance --categoryNetwork`
- Use the Oracle-specific entry pinned to `http://127.0.0.1:9222` when debugging Oracle.
- Keep `chrome-devtools-oracle` registered; it does not affect the global entry and can be reused across runs.
- If port 9222 is busy, Oracle will pick 9223; close old Oracle Chrome sessions to keep 9222 available.

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
If DevTools opens a non-Oracle page (e.g., status UI), use list/select to target the ChatGPT tab.

If you need DevTools to attach reliably, run Oracle with:
- `--browser-port 9222 --browser-keep-browser`

Suggested MCP flow (tool names only):
1) list_pages
2) select_page
3) list_console_messages
4) list_network_requests
5) take_screenshot

## Notes
- Always keep Oracle runs to 4 files max, and avoid duplicate basenames.
- Use `--render --copy` for manual paste if browser runs fail repeatedly.
- If uploads fail, fall back to inline or manual paste.
