# Agent Operating Guide

## Added by Bootstrap 2025-10-16

### Loop Overview
Follow the ai-dev-tasks loop: draft a PRD, expand it into a task list, and process one approved subtask at a time. The control playbooks in `/.ai-dev-tasks` (`create-prd.md`, `generate-tasks.md`, `process-task-list.md`) define each phase.

### Source of Truth
Keep `/tasks` as the canonical record for PRDs, task lists, specs, research notes, and the manifest. Human-facing mirrors in `/docs` must explicitly point back to the `/tasks` originals.

### Mini-Spec Policy
When scoped work meets any trigger in `.agent/SOPs/specs-and-research.md`, create or refresh a mini-spec before implementation. Link specs from their parent PRDs and subtask lists.

### Operating Rules
1) Read `.agent/AGENTS.md` and all docs under `.agent/system/` before drafting plans or executing tasks.
2) Track approvals: default mode is safe `read/edit/run/network`. Log any escalations and mode overrides in `.runs/<task>/<timestamp>/manifest.json`.
3) Update the active `/tasks/tasks-*.md` file after each meaningful change and pause for review.
4) Execute only one subtask at a time and wait for explicit approval before advancing.

### Checklist Convention
Use explicit checkboxes (`[ ]` → `[x]`) for every task and subtask tracked in `/tasks` or mirror docs. Flip the marker to `[x]` as soon as the work is complete and reference the supporting run manifest or log alongside the checkbox note.

### Build & Test Checklist
- [ ] `npm run lint` (always) — runs `npm run build:patterns` first.
- [ ] `npm run test` — covers orchestrator agents, persistence, and adapter logic.
- [ ] `npm run eval:test` — validates evaluation harness; ensure fixtures in `evaluation/fixtures/**` are in sync.
- [ ] `bash scripts/spec-guard.sh --dry-run` — verify specs updated before review.

### External Pointers
- MCP registration: `scripts/run-local-mcp.sh` launches the local server; confirm builder/tester agents produce artifacts in `.runs`.
- Pattern assets: `patterns/index.json` lists available codemods/linters/templates with versions.
- Release mirrors: `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md` must reference their canonical `/tasks` counterparts after every milestone update.

### Local MCP Harness Quickstart
- **One-time setup (optional but handy):**
  ```bash
  ln -s "/Users/asabeko/Documents/Code/CO/scripts/run-local-mcp.sh" /usr/local/bin/codex-local-mcp
  chmod +x /usr/local/bin/codex-local-mcp
  ```
  Drop this config in any repo to reuse the harness:
  ```json
  {
    "mcpServers": {
      "codex-local": {
        "command": "codex-local-mcp"
      }
    }
  }
  ```
- **Start a session:** `scripts/mcp-runner-start.sh --approval-policy never --timeout 3600` launches the Agents SDK runner, then prints the run id and manifest path. Each session spins up `codex mcp-server` in the background and records logs under `.runs/local-mcp/<run-id>/`.
- **Diagnostics sequence:** `scripts/run-mcp-diagnostics.sh` runs the standard build/lint/test/spec-guard workflow end-to-end, waits for completion, and echoes the manifest path so you can update checklists.
- **Poll progress:** `scripts/mcp-runner-poll.sh <run-id> --watch` tails the manifest status until the run finishes. Use it when you launch the runner with `--no-watch` or need to reattach to an existing session.
- **Customize commands:** Call `node scripts/agents_mcp_runner.mjs start --command "<cmd>"` (repeatable) to queue bespoke MCP actions while retaining the start/poll flow. All commands execute via Codex MCP and stream outputs into the manifest.
- **Prerequisites:** Install the Codex CLI and run `npm install` so Node dependencies (including `@openai/agents` and `@modelcontextprotocol/sdk`) are available. Optionally set `OPENAI_API_KEY` if you want Codex traces forwarded to the OpenAI dashboard.
- **Diagnostics shortcut:** `scripts/run-mcp-diagnostics.sh` starts the Agents SDK runner, sets `client_session_timeout_seconds=3600`, and executes build/lint/test/spec-guard through Codex. By default it tails progress until completion and prints the `.runs/local-mcp/<run-id>/manifest.json` path.
- **Manual start/poll controls:** Use `scripts/mcp-runner-start.sh [--timeout 7200] [--approval-policy never]` to enqueue a run and `scripts/mcp-runner-poll.sh <run-id> --watch` to monitor status. Each start command records `runner.log`, per-command response JSON, and the aggregated manifest inside `.runs/local-mcp/<run-id>/`.
- **Extended sessions:** The runner hosts `scripts/run-local-mcp.sh` via `MCPServerStdio` so Codex stays connected well beyond the legacy two-minute limit. Progress updates are written after each command, enabling `poll --watch` to stream state without restarting the run.
- **Staying inside MCP:** The runner calls the Codex MCP `codex` tool for every command—no local shell execution occurs outside Codex. File edits still flow through Codex MCP (`edit` / `run` tools), and command output is captured in the manifest artifacts.
- **Shutdown:** Once the final status is `succeeded` or `failed`, the background runner exits automatically. Review the manifest and per-command JSON files when updating checklists or reporting diagnostics results.

### Quick Links
- Control files: `/.ai-dev-tasks/*`
- Templates: `.agent/task/templates/`
- Spec enforcement: `scripts/spec-guard.sh`
