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
- **Start a session:** `npx --yes @wong2/mcp-cli --config ./mcp-client.json`, pick `codex-local`, then choose the `codex` tool. Provide an `approval_policy` (`never`, `on-request`, etc.) and a natural-language prompt describing the work.
- **Non-interactive call:** When you want to skip the prompt flow, run:
  ```bash
  npx --yes @wong2/mcp-cli --config ./mcp-client.json \
    call-tool codex-local:codex \
    --args '{
      "approval_policy": "never",
      "prompt": "Run npm run build, npm run lint, npm run test, and bash scripts/spec-guard.sh --dry-run. Record outputs in the run manifest and summarize findings."
    }'
  ```
  Adjust the prompt text to describe the task you need Codex to perform.
- **Avoiding timeouts:** Long multi-command prompts can exceed the MCP request window. Prefer sequential calls:
  ```bash
  npx --yes @wong2/mcp-cli --config ./mcp-client.json \
    call-tool codex-local:codex \
    --args '{"approval_policy":"never","prompt":"Run npm run build and record the output in the current MCP run manifest."}'
  # repeat for lint / test / spec-guard
  ```
  Or stay in the interactive CLI and run one command at a time.
- **Do the work through MCP:** Use `call-tool edit` to modify files and `call-tool run` for commands (`npm run lint`, `npm run test`, `bash scripts/spec-guard.sh --dry-run`, etc.). Every call is logged under `.runs/local-mcp/<timestamp>/`.
- **Shut down:** Exit the CLI (Ctrl+C or `exit`). The harness writes `manifest.json`, `mcp-server.log`, and `result.json`. Reference that path when marking checklist items complete.

### Quick Links
- Control files: `/.ai-dev-tasks/*`
- Templates: `.agent/task/templates/`
- Spec enforcement: `scripts/spec-guard.sh`
