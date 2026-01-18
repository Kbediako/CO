#!/usr/bin/env bash
set -euo pipefail

PROMPTS_DIR="${CODEX_PROMPTS_DIR:-$HOME/.codex/prompts}"
FORCE=0

if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

mkdir -p "$PROMPTS_DIR"

write_prompt() {
  local name="$1"
  local path="$PROMPTS_DIR/$name"

  if [[ -f "$path" && $FORCE -ne 1 ]]; then
    echo "[setup-codex-prompts] $name exists; use --force to overwrite." >&2
    return
  fi

  cat > "$path"
}

write_prompt "diagnostics.md" <<'PROMPT'
# Codex CLI Diagnostics Prompt

Use this as `/prompts:diagnostics` with required vars: `TASK=<task-id> MANIFEST=<path> [NOTES=<free text>]`.

Checklist for the run (non-interactive):
1) Abort if `TASK` or `MANIFEST` is missing. Optionally record `NOTES` in the manifest summary.
2) `export MCP_RUNNER_TASK_ID="$TASK"` (do not lowercase or mutate).
3) Confirm `TASK` is registered in `tasks/index.json` (or use an existing registered task id). For top-level tasks, run a delegated subagent with `MCP_RUNNER_TASK_ID=<task-id>-<stream>` so delegation-guard can find manifests; otherwise set `DELEGATION_GUARD_OVERRIDE_REASON` and record it in the manifest.
4) Ensure TFGRPO/feature flags stay unset for baseline diagnostics (e.g., `FEATURE_TFGRPO_GROUP` must be empty).
5) Run diagnostics: `npx @kbediako/codex-orchestrator start diagnostics --format json`.
   - Capture `runId` and manifest path from stdout (`.runs/$TASK/cli/<run-id>/manifest.json`).
6) Watch until completion: `npx @kbediako/codex-orchestrator status --run <run-id> --watch --interval 10` (or tail the manifest) and wait for a terminal state.
7) Read the manifest, confirm command outcomes (delegation-guard/build/lint/test/spec-guard), and note any failures or approvals.
8) Mirror evidence using `$MANIFEST`: update `/tasks`, `docs/TASKS.md`, `.agent/task/...`, `.runs/$TASK/metrics.json`, and `out/$TASK/state.json` with the manifest path. Keep approval decisions logged inside the manifest.
9) Final reply: include `task id`, `run id`, manifest path, command statuses, guardrail outcomes, and any NOTES. Do not add extra commands beyond this sequence.
PROMPT

write_prompt "review-handoff.md" <<'PROMPT'
# Codex CLI Review Handoff Prompt

Use this as `/prompts:review-handoff` with `TASK=<task-id> MANIFEST=<path> NOTES=<goal + summary + risks + optional questions>`.

Checklist (non-interactive):
1) Abort if `TASK`, `MANIFEST`, or `NOTES` is missing. Surface `NOTES` in the summary.
2) `export MCP_RUNNER_TASK_ID="$TASK"`.
3) Run guardrails in order:
   a) `node scripts/delegation-guard.mjs`
   b) `node scripts/spec-guard.mjs --dry-run`
   c) `npm run lint`
   d) `npm run test`
   e) `npm run eval:test` (only if evaluation fixtures exist or the task calls for it)
4) Run reviewer hand-off: `npm run review` (invokes `codex review` with the latest manifest path embedded). If it cannot find a manifest, use `$MANIFEST` explicitly.
5) Keep approvals/escalations logged in the manifest; do not change past records.
6) Mirror evidence using `$MANIFEST` into `/tasks`, `docs/TASKS.md`, `.agent/task/...`, `.runs/$TASK/metrics.json`, and `out/$TASK/state.json`.
7) Final reply: report task id, manifest used, results for each command, any failures/approvals, and the next action (if any). Do not run extra commands beyond this list.
PROMPT

echo "[setup-codex-prompts] Installed prompts under $PROMPTS_DIR."
