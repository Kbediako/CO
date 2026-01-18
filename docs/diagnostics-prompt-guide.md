# Diagnostics Prompt + Output Guide

This guide is the canonical reference for the diagnostics prompt used by clean/first-time agents. Keep it aligned with `scripts/setup-codex-prompts.sh`, which installs the prompt into `~/.codex/prompts/diagnostics.md`.

## Required inputs
- `TASK` (required): task id used for `.runs/<task-id>/` and `out/<task-id>/`.
- `MANIFEST` (required): manifest path used for evidence mirroring.
- `NOTES` (optional): short free text to record in the summary.

## Canonical prompt steps (summary)
1) Abort if `TASK` or `MANIFEST` is missing; optionally record `NOTES` in the manifest summary.
2) `export MCP_RUNNER_TASK_ID="$TASK"` (do not lowercase or mutate).
3) Confirm `TASK` is registered in `tasks/index.json` (or use an existing registered task id). For top-level tasks, run a delegated subagent with `MCP_RUNNER_TASK_ID=<task-id>-<stream>` so delegation-guard can find manifests; otherwise set `DELEGATION_GUARD_OVERRIDE_REASON` and record it in the manifest.
4) Ensure TFGRPO/feature flags stay unset for baseline diagnostics (for example, `FEATURE_TFGRPO_GROUP` must be empty).
5) Run diagnostics: `npx @kbediako/codex-orchestrator start diagnostics --format json`.
6) Watch until completion: `npx @kbediako/codex-orchestrator status --run <run-id> --watch --interval 10` (or tail the manifest).
7) Read the manifest, confirm command outcomes (delegation-guard/build/lint/test/spec-guard), and note any failures or approvals.
8) Mirror evidence using `MANIFEST`: update `/tasks`, `docs/TASKS.md`, `.agent/task/...`, `.runs/<task-id>/metrics.json`, and `out/<task-id>/state.json`.
9) Final reply: include task id, run id, manifest path, command statuses, guardrail outcomes, and any `NOTES`.

## Expected outputs
- Run id + manifest path: `.runs/<task-id>/cli/<run-id>/manifest.json`
- Logs and events: `.runs/<task-id>/cli/<run-id>/runner.ndjson` and `events.jsonl`
- Per-task rollups: `.runs/<task-id>/metrics.json` and `out/<task-id>/state.json`
- Command results and exit codes recorded in the manifest `commands[]` list

## Prompt source + installation
- Canonical prompt text: `scripts/setup-codex-prompts.sh` (writes `diagnostics.md`).
- Install/refresh locally: `scripts/setup-codex-prompts.sh` (use `--force` to overwrite).
- If the prompt changes, update this guide and the script together to keep them in sync.
