# Task Checklist Template — Codex-Orchestrator

> Replace `0001` with your task identifier (or update `MCP_RUNNER_TASK_ID`) after cloning.

## Setup
- [ ] Define the task ID and update environment variables / filenames accordingly.
- [ ] Customize `/tasks/*.md`, `docs/*.md`, and `.agent/` mirrors with project content.
- [ ] Verify `npm install` finishes and baseline scripts (`lint`, `test`) succeed.

## MCP Runner Durability & Telemetry
1. Establish task-scoped run directories
   - Files: `scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-start.sh`, `scripts/mcp-runner-poll.sh`
   - Acceptance: Run manifests land under `.runs/<task>/mcp/<run-id>/` with compatibility pointers under `.runs/local-mcp/`.
   - Status: [ ]
2. Implement heartbeat + resume support
   - Acceptance: Manifest `heartbeat_at` updates every 10s, stale detection triggers `status_detail`, resume clears `completed_at` and `metrics_recorded` before relaunching.
   - Status: [ ]
3. Wire telemetry emission
   - Files: `scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-metrics.js`
   - Acceptance: Terminal runs append to `.runs/<task>/metrics.json`; summary generated with `node scripts/mcp-runner-metrics.js`.
   - Status: [ ]
4. Diagnostics workflow
   - Files: `scripts/run-mcp-diagnostics.sh`
   - Acceptance: Guardrail failures log recommendations and appear in manifest summaries.
   - Status: [ ]

Add or remove sections to fit your project. Each `[ ]` should flip to `[x]` only after you attach the relevant run manifest path.
