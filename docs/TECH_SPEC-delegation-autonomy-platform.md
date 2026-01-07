# Technical Spec - Codex Delegation Autonomy Platform (Task 0940)

## Overview
- Objective: Ship a first-class delegation control plane (MCP tools + UI) that defaults to RLM-driven autonomy, provides real-time observability, and supports repo-scoped GitHub workflows.
- In Scope: MCP server, delegate orchestration, RLM policy defaults, event streaming, UI/TUI controls, config layering, onboarding flows.
- Out of Scope: Cloud hosting, multi-tenant auth, cost/latency optimization, and non-Codex tool ecosystems.

## Architecture & Design
### Current State
- Codex CLI loads MCP tools from config at session start; tools are not injected by this repo.
- Delegation is a policy requirement (docs + guard) but not a tool surface.
- Status UI exists as a read-only dashboard (packages/orchestrator-status-ui) with periodic data refresh.
- RLM runs are available as a pipeline but are not mandatory or policy-driven by default.

### Proposed Changes
#### 1) MCP Delegate Server (minimal tool surface)
- Ship a new MCP server entrypoint in the npm package.
- Tools:
  - delegate.spawn
  - delegate.status
  - delegate.pause
  - delegate.cancel
- Behavior:
  - delegate.spawn launches a new Codex process with a minimal MCP config using codex -c "mcp_servers.<name>.enabled=true".
  - delegate.spawn always uses an explicit tool profile (child config) and does not enable nested delegation by default.
  - delegate.pause sets a pause request so the runner stops at the next step boundary and checkpoints; resume uses delegate.pause with paused=false.
  - delegate.cancel enqueues a cancel request; if confirm_nonce is missing or invalid, it returns confirmation_required (request_id, confirm_scope, action_params_digest, digest_alg, confirm_expires_in_ms) and does not terminate the run.
  - Approved cancel requests are replayed by the runner with confirm_nonce.
  - confirm_nonce is an opaque signed token scoped to { run_id, action, action_params_digest }, short-lived, and single-use.
  - The runner is the only component that mutates manifest terminal state and emits run_canceled.
  - delegate.status reads manifest + events and returns the latest run state.

Spawn model (clarified):
- Parent Codex calls the delegation MCP server.
- The delegation server spawns the child Codex run with a minimal MCP config (explicitly listing tools required for the child).
- <name> refers to the MCP server(s) required by the child run, not the delegation server itself.
- The child run does not include delegation tools by default. If delegate.allow_nested=true, the spawner may set mcp_servers.delegation.enabled=true in the child config; otherwise the child run is spawned without delegate.* tools.

Example tool contract (conceptual):
```json
{
  "name": "delegate.spawn",
  "input": {
    "task_id": "0940-delegation-autonomy-platform",
    "pipeline": "implementation-gate",
    "repo": "/path/to/repo",
    "parent_run_id": "<run-id>",
    "rlm_policy": "always",
    "env": { "CODEX_REVIEW_DEVTOOLS": "0" }
  },
  "output": {
    "run_id": "2026-01-06T12-00-00-000Z-abcdef12",
    "manifest_path": ".runs/0940-delegation-autonomy-platform/cli/<run-id>/manifest.json",
    "events_path": ".runs/0940-delegation-autonomy-platform/cli/<run-id>/events.jsonl"
  }
}
```

Pause/resume contract (conceptual):
```json
{
  "name": "delegate.pause",
  "input": { "run_id": "<run-id>", "paused": true }
}
```

Cancel contract (conceptual):
```json
{
  "name": "delegate.cancel",
  "input": { "run_id": "<run-id>", "confirm_nonce": "<nonce>" }
}
```

Confirmation-required protocol (confirm-to-act):
- Applies to destructive ops such as delegate.cancel and github.merge (and future destructive tools).
- UI/TUI never transmits confirm_nonce. UI/TUI approves by request_id; the runner mints/validates and injects confirm_nonce when replaying the original action. Nonce values never enter the model context or sandbox.
- Protocol state machine (minimum):
  1. Tool call without nonce returns confirmation_required with request_id, confirm_scope, action_params_digest, digest_alg, and confirm_expires_in_ms.
  2. UI/TUI lists pending confirmable actions by request_id and prompts the user.
  3. User approves; UI/TUI sends approval to the runner.
  4. Runner mints/validates confirm_nonce and replays the original action.
  5. Runner emits authoritative event, clears the pending request, and marks nonce_id consumed.
- confirm_scope is an object (not a free-form string) with required fields:
  - { run_id, action, action_params_digest }
  - Optional: target (e.g., repo/PR identifier) for UI display.
- action_params_digest is computed deterministically:
  - digest_alg: "sha256"
  - bytes hashed: UTF-8 of JCS canonical JSON for { tool: "<tool_name>", params: <tool_input_without_confirm_nonce> }
  - encoding: hex
  - confirm_nonce is explicitly excluded from the digest input.
- Nonce minting/signing keys are runner-only. Nonce values must never be written to events.jsonl or stdout (log nonce_id + scope digest only).
- Single-use enforcement persists across runner restarts by recording consumed nonce_id in run state or append-only events.

Nested delegation policy:
- Default: delegate.allow_nested = false.
- When false, the spawner does not set mcp_servers.delegation.enabled=true for child runs (no nested delegate.* tool surface).
- When true, the spawner may set mcp_servers.delegation.enabled=true for child runs to allow nested delegation.

#### 2) RLM Always-On Policy (RLM runtime definition + controls)

Definition:
- "RLM" means the run treats large context (repos/docs/logs) as external state in an execution environment (REPL),
  and the LM programmatically inspects/decomposes it (peek/search/chunk) and may recursively sub-call LMs over
  constructed snippets, then aggregates results.
- This design avoids context rot and enables effective processing beyond the base model's context window.

Policy:
- Default: rlm.policy = "always" for delegated runs.
- Allowed values: always | auto | off
  - off requires explicit confirmation.
  - auto uses a lightweight plan loop for small context and enables full RLM when context density/size warrants it.
  - policy changes apply at run start or resume boundary (no hot reload mid-step).
- RLM policy changes emit rlm_policy_changed events and are summarized in the manifest.
- Ship delegation-first skill guidance to bias top-level Codex toward delegation and oversight.

Root vs Sub-call models:
- rlm.root_model: defaults to the run's configured model.
- rlm.sub_model: defaults to a cheaper sibling model when available (configurable).
- Rationale: cheaper sub-calls can do semantic classification/analysis on chunks; root LM focuses on control/synthesis.

Budgets (runaway prevention):
- rlm.max_iterations (default 50)
- rlm.max_subcalls (default 200)
- rlm.wall_clock_timeout_ms (default 1800000)
- Optional: rlm.budget_usd / rlm.budget_tokens (best-effort; for guardrail not optimization)
- Defaults are enforced even when config omits them; unset/zero values use defaults unless explicitly overridden.
- Default action when exceeded:
  - iterations/subcalls/timeout -> pause
  - usd/tokens -> pause (overrideable)
- When exceeded: emit rlm_budget_exceeded and transition to paused with actionable message; no further subcalls.

Execution environment (REPL / sandbox):
- Default: docker sandbox (isolated) for any RLM code execution.
- Dev-only: local/in-process REPL allowed behind an explicit flag.
- Sandbox requirements:
  - No network by default.
  - Run as non-root.
  - In production mode, the repo is not mounted; repo access is provided only via context.* APIs to enforce allowlists and produce auditable traces.
  - Sandbox-writable mounts MUST be limited to (a) artifacts_dir (LM-generated artifacts) and (b) the request outbox. The response inbox (rlm_responses) MUST be sandbox-read-only and MUST be provided via a separate RO mount (even if it lives under the same host run directory). The runner MUST NOT write into any sandbox-writable mount.
  - events.jsonl, manifest.json, and control.json MUST NOT be mounted into the sandbox at all (neither RO nor RW).
  - Enforce allowlists/allowed_roots in the runner-side context service (or precomputed context pack). If dev-mode repo mounts exist, also enforce via mount-time restrictions.
  - CPU/memory/time limits (defaults ok).
  - Mount layout (normative):
    - artifacts_dir mounted RW into sandbox for LM-generated artifacts and the request outbox (rlm_requests).
    - rlm_responses is a separate bind mount mounted RO into the sandbox (runner writes; sandbox reads).
    - runner_artifacts_dir is not mounted into the sandbox (runner-only).

REPL surface (minimal contract):
- Preloaded variables: context, artifacts_dir, scratch_dir (container-local, not a host mount).
- Helper functions (must be used to enable logging):
  - context.stats()
  - context.search(query)
  - context.peek(offset, length)
  - context.read_chunk(chunk_id)
  - rlm.subcall(input_artifact, purpose, model?)
  - rlm.write_artifact(name, content) -> artifact_ref
- Helper wrappers emit rlm_context_* and rlm_subcall_* events; raw REPL access without wrappers is unsupported in production mode.
- artifacts_dir is the only write target for LM-generated code in production mode.
- In production mode, repo contents are accessed via context.* APIs only; the repo is not mounted.
- Dev-only mounts (if used) must exclude .runs/** and never include control.json or other confirmation material.
- context.* APIs MUST NOT expose .runs/** content, including events.jsonl, manifest.json, or control.json. Attempts return a policy error and emit a redacted security_violation event (no path content).

Host mediation for context access, subcalls, and event emission:
- Default (no network, file-mediated):
  - Mailbox hardening (required):
    - The sandbox-writable request directory MUST be treated as adversarial input.
    - Requests and responses MUST use separate inbox/outbox directories with unidirectional permissions:
    - artifacts_dir/rlm_requests (outbox): sandbox can write; runner can read.
    - artifacts_dir/rlm_responses (inbox): runner can write; sandbox can read (sandbox MUST NOT write).
    - Implementation note: mount layout must ensure the sandbox cannot create/modify entries in rlm_responses (e.g., separate bind mount with ro into the container).
    - Runner MUST NOT follow symlinks/hardlinks when reading request files or writing response files (use O_NOFOLLOW / lstat + fd validation).
    - Runner MUST reject non-regular files and any path that resolves outside the mailbox dir.
    - Runner MUST enforce size limits and a maximum pending request count.
    - Runner MUST NOT write into any sandbox-writable directory. Responses MUST be written only into a runner-writable / sandbox-read-only inbox (rlm_responses).
  - Runner executes context.* and rlm.subcall, writes responses to rlm_responses, and emits authoritative rlm_context_* / rlm_subcall_* events to events.jsonl.
- Optional (restricted local RPC):
  - Sandbox RPC endpoint is capability-scoped (context.* + rlm.subcall only) and MUST NOT share auth/token/port with UI control endpoints.
  - RPC rejects any control/confirmation actions; runner enforces a hard method allowlist with strict input validation.
  - Sandbox MUST NOT receive any auth token that can call approval / cancel / merge endpoints.
  - No outbound internet from the sandbox; runner remains the sole writer of events.jsonl.

Prompting / model-specific tuning:
- Maintain per-model-family RLM system prompts.
- Include explicit batching guidance to prevent "subcall per line" explosions.
- Call out that batching guidance addresses observed RLM trajectory failure modes (subcall explosion) so it is not removed in future edits.
- Require minimum coding capability for sub-call models; fallback to root-only or disable recursion when not met.

#### 3) Observability + Control UI (Web + TUI)
- Extend packages/orchestrator-status-ui into a control center.
- Add a local server endpoint to stream events and accept control actions.
- Web UI shows:
  - Live run list, timeline, progress bar, and current step.
  - Agent-to-agent interactions and decision logs from events.jsonl.
  - Controls for pause, resume, cancel, and feature toggles.
  - Pending confirm-to-act requests surfaced from confirmation_required events.
- TUI provides a lightweight status grid with key actions.
- Control actions are recorded as per-run control requests in a control.json file per run.
  - Path: .runs/<task-id>/cli/<run-id>/control.json
  - Schema (conceptual):
    - { run_id, request_id, control_seq, requested_by, action: "pause" | "resume" | "cancel", requested_at, confirm? }
    - confirm: { nonce_id, scope, action_params_digest, digest_alg, issued_at, expires_at }
  - The runner polls control.json at step boundaries, validates confirm (scope/expiry/single-use), applies requests, and emits the authoritative events (pause_requested, run_paused, run_resumed, run_canceled).
  - Invalid/missing confirmation yields confirmation_required and no state change.
  - confirm_nonce is minted by the runner and provided only through the UI/TUI confirmation flow; it is not readable or writable by the sandboxed REPL and must not be logged (nonce_id only).
  - confirm_nonce bytes MUST NOT be persisted; runner may re-mint on replay after approval. Only nonce_id and metadata are stored.
  - control.json MUST NOT contain confirm_nonce (or any secret nonce material). If present, the runner MUST treat the request as invalid, emit a redacted security_violation event, and take no action.
  - Nonce consumption is persisted (nonce_id recorded in run state or append-only events) so single-use enforcement survives runner restarts.
  - Writers must update control.json atomically (write temp + rename) to avoid partial reads.
  - control.json represents the latest requested action only; new writes overwrite prior requests. The runner processes requests with control_seq > last_applied_control_seq (idempotent).

#### 4) Event Stream (events.jsonl)
- Append-only JSONL per run for UI + auditing.
- Event types: run_started, step_started, step_completed, step_failed, tool_called, agent_message, rlm_iteration, rlm_repl_exec, rlm_context_search, rlm_context_peek, rlm_context_chunk_read, rlm_subcall_started, rlm_subcall_completed, rlm_budget_exceeded, rlm_policy_changed, confirmation_required, confirmation_resolved, security_violation, pause_requested, run_paused, run_resumed, run_canceled, run_completed, run_failed.
- Required fields (schema v1):
  - schema_version, seq, timestamp, task_id, run_id, event, actor, payload.
  - Optional: parent_run_id, pipeline, error.
- timestamp format: RFC3339/ISO-8601 UTC (e.g., 2026-01-06T12:00:00Z).
- rlm_policy_changed payload: { old_policy, new_policy, effective_at: "run_start" | "resume_boundary" }.
- rlm_repl_exec payload: { iteration, code_digest, code_artifact?, stdout_artifact?, stderr_artifact?, duration_ms }.
- rlm_context_search payload: { iteration, query, match_count?, output_artifact? }.
- rlm_context_peek payload: { iteration, offset, length, output_artifact? }.
- rlm_context_chunk_read payload: { iteration, chunk_id, length, output_artifact? }.
- rlm_subcall_started payload: { iteration, subcall_id, model, input_chars, purpose, input_artifact? }.
- rlm_subcall_completed payload: { iteration, subcall_id, model, output_chars, duration_ms, output_artifact? }.
- rlm_budget_exceeded payload: { budget_type: "iterations" | "subcalls" | "timeout" | "usd" | "tokens", limit, observed, action: "pause" | "fail" }.
- confirmation_required payload: { request_id, confirm_scope, action_params_digest, digest_alg, confirm_expires_in_ms }.
- confirmation_resolved payload: { request_id, nonce_id, outcome: "approved" | "expired" | "canceled" }.
- security_violation payload: { kind, summary, severity: "low" | "med" | "high", related_request_id?, control_seq?, details_redacted: true } (redact secrets, confirm_nonce, auth tokens, and raw blocked paths; use hashes/opaque IDs if needed).
- actor values: runner | ui | user | parent | delegate (extensible).
- Ordering guarantees:
  - Single-writer (runner) appends events.
  - seq is monotonic within a run; append-only with no rewrites.
- Control-related events (pause_requested, run_paused, run_resumed, run_canceled) MUST include request_id and control_seq when the transition is control-driven.
- UI/control endpoints never write events.jsonl directly; they enqueue requests and the runner emits the corresponding events.
- UI consumes events.jsonl for near-real-time updates; manifest remains canonical summary.
- Large RLM blobs (subcall prompts/outputs, REPL stdout) must be stored as runner-written artifacts (runner_artifacts_dir, not sandbox-writable) and referenced from events.jsonl, not inlined. The only sandbox-readable runner output is the rlm_responses inbox (RO in sandbox).
- Sensitive fields MUST NOT be written to events.jsonl or server logs. Redact or omit:
  - confirm_nonce (store nonce_id + scope digest only)
  - auth tokens, cookies, headers
  - secret env vars passed to child runs

#### 5) Config Layering (Global + Repo)
- Global config: CODEX_HOME/config.toml (or ~/.codex/config.toml)
  - Register MCP server disabled by default.
- Global defaults: delegate.allow_nested, delegate.tool_profile, rlm.policy.
- Repo config: .codex/orchestrator.toml
  - Repo-specific overrides, allowlists, and GitHub settings.
- Precedence: CLI flags > env vars > repo config > global config.
  - Exception (GitHub authorization): github.enabled and github.operations are read exclusively from .codex/orchestrator.toml.
    Ignore global config, CLI flags, and env vars for these keys (they must not enable or expand GitHub permissions).
- Enablement model:
  - Delegation tools are available iff mcp_servers.delegation.enabled=true for that run.
  - [delegate] config controls behavior (allow_nested, tool_profile) but does not enable the tool surface.
- Merge semantics:
  - Scalars: override.
  - Maps: deep-merge.
  - Arrays: replace (no implicit union).
- Repo-scoped authorization rule (GitHub):
  - github.enabled and github.operations are evaluated only from repo config (.codex/orchestrator.toml).
  - Global/CLI/env values must not grant operations; missing ops are denied by default.
- Repo-cap rule (filesystem):
  - paths.allowed_roots is capped by repo config; higher-precedence layers may only narrow (intersection), never expand.
- Example keys (conceptual):
  - delegate.allow_nested, delegate.tool_profile
  - rlm.policy
  - rlm.root_model, rlm.sub_model
  - rlm.max_iterations, rlm.max_subcalls, rlm.wall_clock_timeout_ms
  - rlm.budget_usd, rlm.budget_tokens
  - rlm.environment
  - ui.control_enabled, ui.bind_host, ui.auth_token
  - github.enabled
  - github.operations (repo-scoped only; ignored outside repo config)
  - paths.allowed_roots

Example config (global):
```toml
[delegate]
allow_nested = false
tool_profile = ["shell", "filesystem", "orchestrator"]

[rlm]
policy = "always"
environment = "docker"
max_iterations = 50
max_subcalls = 200
wall_clock_timeout_ms = 1800000 # 30m
# root_model/sub_model optional; defaulting is allowed

[ui]
control_enabled = false
bind_host = "127.0.0.1"
```

Example config (repo):
```toml
# NOTE: GitHub authorization is repo-scoped only.
# Configure [github].enabled and [github].operations here (not in global config).
[delegate]
allow_nested = false

[github]
enabled = true
operations = ["open_pr", "comment", "merge"]
```

tool_profile entries map to mcp_servers.<name> keys (or named tool groups defined in Codex config).
Example: tool_profile = ["chrome-devtools"] -> mcp_servers.chrome-devtools.enabled=true in the child config.

#### 6) GitHub Integration (first-class, gated)
- Ship GitHub operations in the same MCP server (gated by repo config).
- Prefer gh when installed; fallback to token-based API.
- UI surfaces PR status, checks, and merge controls; destructive actions require confirmation.
- Operations must be explicitly listed in repo config (.codex/orchestrator.toml) as an allowlist per operation; global config cannot grant additional operations.
- Execution rule: operation runs only if .codex/orchestrator.toml has [github].enabled=true and the operation is listed in .codex/orchestrator.toml [github].operations; otherwise return a “disallowed by repo policy” error without calling gh/API.
- If gh is present but unauthenticated, fail with actionable guidance; only use token fallback when configured.

Supported GitHub operation IDs (v1):
- open_pr — create/open a pull request (mutating)
- comment — create a PR/issue comment (mutating)
- review — submit a PR review (APPROVE | REQUEST_CHANGES | COMMENT) (mutating)
- get_checks — fetch PR/commit checks status (read-only)
- merge — merge a PR (mutating; confirm-to-act required)
  - Enforcement: if confirmation is not present, return confirmation_required and do not call gh/API.
  - Confirmation signal: runner mints confirm_nonce after user approval (UI/TUI approves by request_id only). UI/TUI never transmits nonce; runner injects it when replaying.
  - Nonce scope includes run_id + operation + target PR identifier; nonce is single-use and short-lived.
  - confirmation_required response includes request_id, confirm_scope, action_params_digest, digest_alg, and confirm_expires_in_ms.
Unknown operation IDs must be denied by default.

#### 7) Onboarding
- Self-serve: docs + CLI commands.
- Guided: CLI setup wizard with --yes support for non-interactive runs.
- Codex-assisted: top-level Codex runs setup commands and confirms with the user.

Minimum copy-paste flow (conceptual):
```
# one-time registration (replace <pkg> + <entrypoint>)
codex mcp add delegation -- npx -y <pkg> <entrypoint>

# enable delegation tools for one run
codex -c 'mcp_servers.delegation.enabled=true' ...

# repo policy is still enforced via .codex/orchestrator.toml (allowlists, GitHub ops)

# open control UI
npm run status-ui -- --control
```

## Data Persistence / State Impact
- Add events.jsonl under .runs/<task-id>/cli/<run-id>/events.jsonl.
- No breaking changes to existing manifest schema.
- UI reads existing manifests, state.json, metrics.json, and new event streams.
- Note: metrics.json is NDJSON (one JSON object per line).
- run_id values remain filesystem-safe (colons replaced) even when derived from timestamps.

## External Dependencies
- Codex CLI with MCP support.
- Optional: GitHub CLI (gh) when GitHub integration is enabled.
- No new hosted services.

## Operational Considerations
- Failure Modes:
  - MCP server not registered or disabled (delegate.spawn unavailable).
  - Missing repo allowlist or config conflicts.
  - UI actions failing due to missing permissions or missing gh auth.
- Observability & Telemetry:
  - UI updates from events.jsonl + manifest heartbeat.
  - Errors summarized in manifest and surfaced in UI.
- Security / Privacy:
  - Local-only by default; no remote telemetry.
  - Control plane binds to 127.0.0.1 by default (explicit override required).
  - Control endpoints require an auth token and CSRF protection.
  - Destructive actions (cancel, merge) require confirm-to-act UX.
  - GitHub actions gated by explicit repo config and user confirmations.
  - RLM / REPL security:
    - Default to isolated sandbox execution for any LM-generated code (Docker).
    - Disable network access by default in the sandbox.
    - Enforce paths.allowed_roots and repo allowlists inside the sandbox; deny filesystem access outside the allowlist.
    - Never allow UI/control endpoints to inject REPL code; control requests are high-level and runner-mediated.

## Testing Strategy
- MCP tool contract tests (spawn, pause, cancel, status).
- Event stream tests (ordering, append-only, schema validation).
- UI integration tests for live update + action endpoints.
- Config precedence tests (global vs repo vs CLI).
- GitHub workflow tests using fixtures and optional gh stubs.
- RLM budget enforcement tests (iterations/subcalls/timeouts).
- RLM trace integrity tests (events reference artifacts; no large blobs in events.jsonl).
- Sandbox escape regression tests (network disabled, allowed_roots enforced).
- Mailbox security tests (symlink/path traversal/hardlink tricks in rlm_requests/rlm_responses; runner must reject).
- Model-family prompt regression tests (ensure subcall batching guidance is present where needed).

## Documentation & Evidence
- Linked PRD: docs/PRD-delegation-autonomy-platform.md
- Action Plan: docs/ACTION_PLAN-delegation-autonomy-platform.md
- Mini-spec: tasks/specs/0940-delegation-autonomy-platform.md
- Task checklist: tasks/tasks-0940-delegation-autonomy-platform.md

## Open Questions
- Should the control UI live under the existing status UI route or a new entrypoint?
- How should we expose multi-repo views (workspace list vs explicit allowlist)?

## Approvals
- Engineering: Pending
- Reviewer: Pending
