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
  - delegate.question.enqueue
  - delegate.question.poll
- Behavior:
  - delegate.spawn launches a new Codex process with a minimal MCP config; delegation is enabled in question_only mode for escalation, and additional tool servers are enabled via codex -c "mcp_servers.<name>.enabled=true".
  - delegate.spawn always uses an explicit tool profile (child config) and does not enable nested delegation by default.
  - delegate.pause sets a pause request so the runner stops at the next step boundary and checkpoints; resume uses delegate.pause with paused=false.
  - delegate.cancel enqueues a cancel request; if confirm_nonce is missing or invalid, it returns confirmation_required (request_id, confirm_scope, action_params_digest, digest_alg, confirm_expires_in_ms) and does not terminate the run.
  - Approved cancel requests are replayed by the runner with confirm_nonce.
  - confirm_nonce is an opaque signed token scoped to { run_id, action, action_params_digest }, short-lived, and single-use.
  - The runner is the only component that mutates manifest terminal state and emits run_canceled.
  - All delegate.* operations that change run state must call the runner control API; the MCP server never writes control.json or appends events.jsonl.
  - delegate.status reads manifest + events and returns the latest run state.
  - delegate.question.enqueue submits an escalation question to the parent run via the delegation server (never by writing parent-run files directly).
  - delegate.question.poll returns the current status/answer for a question (or waits with a bounded timeout).
  - delegate.spawn provisions a runner-only delegation_token scoped to {parent_run_id, child_run_id}; the runner injects it for delegate.question.* calls.

Spawn model (clarified):
- Parent Codex calls the delegation MCP server.
- The delegation server spawns the child Codex run with a minimal MCP config (explicitly listing tools required for the child).
- <name> refers to additional MCP server(s) required by the child run beyond delegation; the delegation server is still enabled in question_only mode for escalation.
- The child run does not include parent-control delegation tools by default. It does include a restricted question client (delegate.question.enqueue, delegate.question.poll, optionally delegate.status) so escalation questions work without enabling spawn/pause/cancel.
- Mechanism: the child run enables mcp_servers.delegation.enabled=true but sets delegate.mode=question_only, which registers only delegate.question.* (and optionally delegate.status) for the delegate namespace. GitHub tool registration is independent and remains governed by repo policy (since github.* lives in the delegation server, tool_profile does not gate it); question_only does not suppress github.*. If delegate.allow_nested=true, the spawner sets delegate.mode=full to allow full nested delegation.

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
Run locator (normative):
- manifest_path is required for stateful delegate.* calls (pause/cancel/status) to avoid ambiguous lookup in multi-repo setups.
- For question queue calls, parent_manifest_path (the parent run's manifest_path) is required for the same reason.
- { task_id, run_id } / { parent_task_id, parent_run_id } may be included for display/audit, but are not sufficient by themselves.
Note: the delegation_token is minted by the runner, stored out-of-band (runner state), and injected when the child uses delegate.question.*. It is never surfaced to the model or written to events.jsonl.

Pause/resume contract (conceptual):
```json
{
  "name": "delegate.pause",
  "input": {
    "task_id": "<task-id>",
    "run_id": "<run-id>",
    "manifest_path": ".runs/<task-id>/cli/<run-id>/manifest.json",
    "paused": true
  }
}
```

Status contract (conceptual):
```json
{
  "name": "delegate.status",
  "input": {
    "task_id": "<task-id>",
    "run_id": "<run-id>",
    "manifest_path": ".runs/<task-id>/cli/<run-id>/manifest.json"
  }
}
```

Cancel contract (conceptual, model-visible):
```json
{
  "name": "delegate.cancel",
  "input": {
    "task_id": "<task-id>",
    "run_id": "<run-id>",
    "manifest_path": ".runs/<task-id>/cli/<run-id>/manifest.json"
  }
}
```
Runner-injected envelope (not model-visible):
```json
{
  "codex_private": {
    "confirm_nonce": "<nonce>"
  }
}
```

Question queue contract (conceptual):
```json
{
  "name": "delegate.question.enqueue",
  "input": {
    "parent_manifest_path": ".runs/<task-id>/cli/<parent-run-id>/manifest.json",
    "parent_task_id": "<task-id>",
    "parent_run_id": "<parent-run-id>",
    "prompt": "Need approval to widen allowed_roots to include /tmp?",
    "urgency": "med",
    "auto_pause": true,
    "expires_in_ms": 1800000
  },
  "output": {
    "question_id": "q-2026-01-07-0001",
    "status": "queued",
    "queued_at": "2026-01-07T12:00:00Z",
    "expires_at": "2026-01-07T12:30:00Z"
  }
}
```
```json
{
  "name": "delegate.question.poll",
  "input": {
    "parent_manifest_path": ".runs/<task-id>/cli/<parent-run-id>/manifest.json",
    "parent_task_id": "<task-id>",
    "question_id": "q-2026-01-07-0001",
    "wait_ms": 5000
  },
  "output": {
    "status": "answered",
    "answer": "Approved for this run only; keep /tmp read-only.",
    "answered_at": "2026-01-07T12:05:00Z"
  }
}
```
Poll responses may return status in { queued, answered, expired, dismissed }. On expired, include expired_at (== expires_at) and fallback_action to reflect delegate.question.expiry_fallback.

Confirmation-required protocol (confirm-to-act):
- Applies to destructive ops such as delegate.cancel and github.merge (and future destructive tools).
- UI/TUI never transmits confirm_nonce. UI/TUI approves by request_id; the runner mints/validates and injects confirm_nonce when replaying the original action. Nonce values never enter the model context or sandbox.
- Protocol state machine (minimum):
  1. Tool call without nonce returns confirmation_required with request_id, confirm_scope, action_params_digest, digest_alg, and confirm_expires_in_ms.
  2. UI/TUI lists pending confirmable actions by request_id and prompts the user.
  3. User approves; UI/TUI sends approval to the runner.
  4. Runner mints/validates confirm_nonce and replays the original action.
  5. Runner emits authoritative event, clears the pending request, and marks nonce_id consumed.
- Normative ownership flow:
  - On missing/invalid nonce, the MCP server calls a runner-only endpoint (e.g., POST /confirmations/create) with the tool name + params (sans confirm_nonce).
  - The runner generates request_id, persists the pending confirmation, and returns the confirmation_required payload to the MCP server.
  - The MCP server returns confirmation_required to the model; the runner is the sole authority for request_id creation, persistence, and dedupe.
- confirm_scope is an object (not a free-form string) with required fields:
  - { run_id, action, action_params_digest }
  - Optional: target (e.g., repo/PR identifier) for UI display.
- action_params_digest is computed deterministically:
  - digest_alg: "sha256"
  - bytes hashed: UTF-8 of JSON Canonicalization Scheme (JCS, RFC 8785) canonical JSON for { tool: "<tool_name>", params: <tool_input_without_confirm_nonce> }
  - encoding: hex
  - JCS is the JSON Canonicalization Scheme defined in RFC 8785; all components MUST use this canonicalization to avoid digest mismatches.
  - confirm_nonce is explicitly excluded from the digest input.
- Nonce minting/signing keys are runner-only. Nonce values must never be written to events.jsonl or stdout (log nonce_id + scope digest only).
- Single-use enforcement persists across runner restarts by recording consumed nonce_id in run state or append-only events.
- Nonce verification architecture (explicit):
  - Runner mints and validates confirm_nonce values; the MCP server treats confirm_nonce as opaque and calls a runner-only validation endpoint.
  - The runner responds with {valid/invalid, scope_match} and performs single-use checks; the MCP server never holds signing keys.
  - request_id is generated by the runner on confirmation_required and is the stable key for dedupe + UI display.

Confirm-required runtime handling (tool-originated actions):
- When a tool call returns confirmation_required, the runner records a pending confirmation entry (keyed by request_id + action_params_digest) and emits confirmation_required once.
- Default behavior: transition the run to paused with reason=confirmation_required at the next step boundary (config: confirm.auto_pause=true by default).
- Dedupe: if the same action_params_digest is already pending, return the existing request_id instead of creating a new one; emit no new confirmation_required event.
- Pending confirmations are persisted in runner state (manifest metadata or a small runner state file) so they survive restarts.
- Multiple pending confirmations are allowed; UI/TUI lists them by request_id + scope digest with timestamps.
- Expiry: on confirm_expires_in_ms, the runner emits confirmation_resolved with outcome=expired, clears the pending entry, and requires a fresh tool call to re-request confirmation.
- A configurable cap (confirm.max_pending) limits pending confirmations per run; exceeding the cap yields a confirmation_required error with a rate-limit hint.
- Runner replay path (normative): the model-originated tool call must never include confirm_nonce. After user approval, the runner replays the tool call directly to the MCP server with confirm_nonce injected out-of-band; the replay is not inserted into the model transcript and is logged to events.jsonl with secrets redacted.
- If a model-originated tool call includes confirm_nonce, the runner MUST reject it, emit a redacted security_violation event, and treat it as invalid.
- Secret injection mechanism (normative):
  - The runner is the MCP tool host and intercepts model tool calls before dispatch.
  - V1 concrete mechanism: extend the MCP host with a private envelope (e.g., `codex_private`) that is carried alongside the tool invocation but never serialized into the model transcript or events. For stdio/JSON-RPC, this is a host-only field in the request object; for HTTP transports, it maps to a private header (e.g., `X-Codex-Private`).
  - Implementation ownership (decision): v1 requires the MCP host layer (Codex CLI / shared host library) to support `codex_private`. This is a hard dependency tracked in the Action Plan.
  - For confirm_nonce and delegation_token, the runner strips any model-supplied values, rejects the call with security_violation, and injects secrets into `codex_private`.
  - Events/logging record only action_params_digest and a safe summary; injected secrets are never serialized.

Step boundaries + pause/cancel semantics (normative):
- Definition: a step boundary occurs after the runner completes a model turn and all tool calls spawned by that turn, persists events, and before the next model sample begins.
- For RLM loops, each subcall iteration (context.* + rlm.subcall + response handling) is a step; the boundary is after the subcall completes and events are emitted.
- Long-running tools are allowed to finish their current invocation; boundaries occur when they return (no mid-tool preemption unless the tool supports cancellation).
- delegate.pause (or auto_pause) sets pause_requested immediately, emits pause_requested, and transitions to run_paused at the next step boundary with a checkpoint.
- delegate.cancel without confirmation returns confirmation_required (and, if confirm.auto_pause=true, the run pauses at the next step boundary). It does not set cancel_requested.
- After approval, the runner replays delegate.cancel with confirm_nonce; only the confirmed/replayed cancel sets cancel_requested. At the next step boundary, the run transitions to run_canceled and no further model steps or subcalls occur.
- If a confirmed cancel is requested during a long-running tool or subcall, the runner marks cancel_pending and stops at the first safe boundary; it must not start new subcalls after cancel_pending is set.

Nested delegation policy:
- Default: delegate.allow_nested = false.
- When false, the spawner sets mcp_servers.delegation.enabled=true with delegate.mode=question_only (no spawn/pause/cancel).
- When true, the spawner sets delegate.mode=full to allow nested delegation.

Operational limits / guardrails:
- `delegate.question.poll` clamps wait_ms to MAX_QUESTION_POLL_WAIT_MS (10s); per-poll timeout is bounded by remaining wait_ms.
- Confirmation fallback is restricted to confirmation error codes only (`error.code` check).
- Tool profile entries used for MCP overrides must match `^[A-Za-z0-9_-]+$` (alnum + `_`/`-`); reject entries containing `;`, `/`, `\n`, `=` and similar.

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
- Deep recursion is supported; rlm.max_subcall_depth defines the maximum nested sub-call depth (multi-level, not capped at one). The RLM paper used depth=1, so depth>1 is a deliberate divergence that must be validated via internal benchmarks. Planned default is depth=4, but shipping default remains depth=1 until the benchmark gate passes (per-run overrides allowed). V1 default behavior is depth=1; deeper recursion is opt-in via explicit per-run override and is out-of-scope for the default path.
- RLM policy changes emit rlm_policy_changed events and are summarized in the manifest.
- Ship delegation-first skill guidance to bias top-level Codex toward delegation and oversight.

Root vs Sub-call models:
- rlm.root_model: defaults to the run's configured model.
- rlm.sub_model: defaults to a cheaper sibling model when available (configurable).
- Rationale: cheaper sub-calls can do semantic classification/analysis on chunks; root LM focuses on control/synthesis.

Budgets (runaway prevention):
- rlm.max_iterations (default 50)
- rlm.max_subcalls (default 200)
- rlm.max_subcall_depth (planned default 4; shipping default 1 until benchmark gate passes; configurable; per-run override allowed for deeper recursion)
- rlm.wall_clock_timeout_ms (default 1800000)
- Optional: rlm.budget_usd / rlm.budget_tokens (best-effort; for guardrail not optimization)
- Defaults are enforced even when config omits them; unset/zero values use defaults unless explicitly overridden.
- Default action when exceeded:
  - iterations/subcalls/subcall_depth/timeout -> pause
  - usd/tokens -> pause (overrideable)
- When exceeded: emit rlm_budget_exceeded and transition to paused with actionable message; no further subcalls.
- Depth-cap handling (explicit): if a subcall would exceed rlm.max_subcall_depth, emit rlm_budget_exceeded with budget_type=subcall_depth, include limit + observed depth, and transition the run to paused (no further subcalls).

Execution environment (REPL / sandbox):
- Canonical run directory layout (normative):
  - .runs/<task-id>/cli/<run-id>/
    - artifacts/ (LM-generated artifacts; mounted RW into sandbox as artifacts_dir)
    - runner_artifacts/ (runner-only artifacts; not mounted into sandbox)
    - mailbox/
      - outbox/ (sandbox writes requests; mounted RW into sandbox as /mnt/rlm_requests)
      - inbox/ (runner writes responses; mounted RO into sandbox as /mnt/rlm_responses)
- Default: docker sandbox (isolated) for any RLM code execution.
- Dev-only: local/in-process REPL allowed behind an explicit flag.
- Docker unavailable behavior (explicit):
  - Default: fail-fast with actionable error (install/enable Docker) and keep the run paused.
  - If repo allows dev mode, users may explicitly opt into local/in-process REPL with a confirmation prompt (runner.mode=dev + rlm.environment=local).
- Mode gating:
  - runner.mode = "prod" | "dev" (default "prod" for delegated runs).
  - "prod" enforces docker sandbox, no repo mounts, and disallows local/in-process REPL.
  - "dev" allows local/in-process REPL and optional repo mounts (still excludes .runs/**, control.json, events.jsonl, manifest.json).
  - runner.mode is repo-capped: repo config defines whether dev is allowed; env/CLI can select dev only if the repo allows it (otherwise ignored). Default is prod.
- Sandbox requirements:
  - No network by default; prod mode forbids outbound network. Dev mode may allow outbound network only when explicitly enabled and repo-capped.
  - Run as non-root.
  - In production mode, the repo is not mounted; repo access is provided only via context.* APIs to enforce allowlists and produce auditable traces.
  - Sandbox-writable mounts MUST be limited to (a) artifacts_dir (LM-generated artifacts) and (b) mailbox/outbox (rlm_requests). The response inbox (mailbox/inbox / rlm_responses) MUST be sandbox-read-only and MUST be provided via a separate RO mount (even if it lives under the same host run directory). The runner MUST NOT write into any sandbox-writable mount.
  - events.jsonl, manifest.json, and control.json MUST NOT be mounted into the sandbox at all (neither RO nor RW).
  - Enforce allowlists/allowed_roots in the runner-side context service (or precomputed context pack). If dev-mode repo mounts exist, also enforce via mount-time restrictions.
  - CPU/memory/time limits (defaults ok).
  - Mount layout (normative):
    - artifacts_dir mounted RW into sandbox for LM-generated artifacts only.
    - mailbox/outbox mounted RW into sandbox as /mnt/rlm_requests (sandbox writes; runner reads).
    - mailbox/inbox mounted RO into sandbox as /mnt/rlm_responses (runner writes; sandbox reads).
    - runner_artifacts_dir is not mounted into the sandbox (runner-only).
  - Example layout (avoid RW/RO overlap):
    - Host: .runs/<task-id>/cli/<run-id>/mailbox/outbox -> /mnt/rlm_requests (RW in sandbox)
    - Host: .runs/<task-id>/cli/<run-id>/mailbox/inbox -> /mnt/rlm_responses (RO in sandbox)

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
- All model-accessible file surfaces (filesystem MCP tools, shell environments, repo mounts) MUST hard-deny .runs/** and other control-plane paths; the denylist applies globally, not just to context.* APIs.
  - Note: this denylist applies to model-accessible repo/file surfaces; it does not prohibit the runner from mounting the current run’s artifacts/ and mailbox/{outbox,inbox} into the sandbox.
  - Enforcement matrix (normative):
    | Surface | Enforcement | Evidence |
    | --- | --- | --- |
    | context.* APIs (runner) | allowlist + denylist check; return policy_error; emit security_violation | unit tests for policy + event emission |
    | filesystem MCP tools (read/write/list/shell) | global denylist after allowlist; reject before exec | policy tests + tool error logs |
    | repo mounts (dev) | mount excludes .runs/** and control-plane files | mount config checks |
    | sandbox mounts | allow only current run artifacts/ + mailbox/{outbox,inbox}; never mount events.jsonl/manifest.json/control.json or other .runs/** | container config audit |
    | UI/TUI | allowlist run roots; no direct file writes | UI integration tests |

Host mediation for context access, subcalls, and event emission:
- Default (no network, file-mediated):
  - Mailbox hardening (required):
    - The sandbox-writable request directory MUST be treated as adversarial input.
    - Requests and responses MUST use separate inbox/outbox directories with unidirectional permissions:
    - mailbox/outbox (rlm_requests): sandbox can write; runner can read.
    - mailbox/inbox (rlm_responses): runner can write; sandbox can read (sandbox MUST NOT write).
    - Implementation note: mount layout must ensure the sandbox cannot create/modify entries in rlm_responses (e.g., separate bind mount with ro into the container).
    - Runner MUST NOT follow symlinks/hardlinks when reading request files or writing response files (use O_NOFOLLOW / lstat + fd validation).
    - Runner MUST reject non-regular files and any path that resolves outside the mailbox dir.
    - Runner MUST enforce size limits and a maximum pending request count.
    - Runner MUST NOT write into any sandbox-writable directory. Responses MUST be written only into a runner-writable / sandbox-read-only inbox (mailbox/inbox, rlm_responses).
  - Runner executes context.* and rlm.subcall, writes responses to mailbox/inbox (rlm_responses), and emits authoritative rlm_context_* / rlm_subcall_* events to events.jsonl.
- Optional (restricted local RPC):
  - Sandbox RPC endpoint is capability-scoped (context.* + rlm.subcall only) and MUST NOT share auth/token/port with UI control endpoints.
  - RPC rejects any control/confirmation actions; runner enforces a hard method allowlist with strict input validation.
  - Sandbox MUST NOT receive any auth token that can call approval / cancel / merge endpoints.
  - No outbound internet from the sandbox in prod; dev-mode outbound network is allowed only when explicitly enabled and repo-capped. Runner remains the sole writer of events.jsonl.

Prompting / model-specific tuning:
- Maintain per-model-family RLM system prompts.
- Include explicit batching guidance to prevent "subcall per line" explosions.
- Call out that batching guidance addresses observed RLM trajectory failure modes (subcall explosion) so it is not removed in future edits.
- Require minimum coding capability for sub-call models; fallback to root-only or disable recursion when not met.

RLM reference:
- https://github.com/alexzhang13/rlm

#### 3) Observability + Control UI (Web + TUI)
- Extend packages/orchestrator-status-ui into a control center.
- Control-plane ownership: the runner hosts the local control API + event stream (no separate control server process). Status UI/TUI are clients only.
- Runner exposes authenticated localhost HTTP endpoints for control actions and event streaming; UI/TUI connect to those endpoints.
- Control-plane model (canonical): UI/TUI call the authenticated local HTTP API; the runner is the only writer of control.json (persistence/queue) and events.jsonl. UI/TUI never write .runs/** directly.
- Web UI shows:
  - Live run list, timeline, progress bar, and current step.
  - Agent-to-agent interactions and decision logs from events.jsonl.
  - Controls for pause, resume, cancel, and per-run feature toggles (global/repo flags are displayed read-only).
  - Pending confirm-to-act requests surfaced from confirmation_required events.
  - Escalation question queue (pending + answered) for parent runs, with run linkage and timestamps.
  - Run discovery is allowlist-based (ui.allowed_run_roots); default scope is the current repo only, with no recursive filesystem scans.
- TUI provides a lightweight status grid with key actions.
- Control actions are recorded as per-run control requests in a control.json file per run.
  - Path: .runs/<task-id>/cli/<run-id>/control.json
  - Schema (conceptual, single shape):
    - { run_id, control_seq, latest_action: { request_id, requested_by, action: "pause" | "resume" | "cancel", requested_at, confirm? }, feature_toggles: { rlm.policy, ... } }
    - confirm: { nonce_id, scope, action_params_digest, digest_alg, issued_at, expires_at }
- control.json is runner-written only (UI/TUI call the HTTP control API; the runner persists requests).
- The runner polls control.json at step boundaries, validates confirm (scope/expiry/single-use), applies requests, and emits the authoritative events (pause_requested, run_paused, run_resumed, run_canceled).
- Invalid/missing confirmation yields confirmation_required and no state change for confirm-required actions (e.g., cancel/merge). Pause/resume do not require confirmation.
  - confirm_nonce is minted by the runner and provided only through the UI/TUI confirmation flow; it is not readable or writable by the sandboxed REPL and must not be logged (nonce_id only).
  - confirm_nonce bytes MUST NOT be persisted; runner may re-mint on replay after approval. Only nonce_id and metadata are stored.
  - control.json MUST NOT contain confirm_nonce (or any secret nonce material). If present, the runner MUST treat the request as invalid, emit a redacted security_violation event, and take no action.
  - Nonce consumption is persisted (nonce_id recorded in run state or append-only events) so single-use enforcement survives runner restarts.
  - Writers must update control.json atomically (write temp + rename) to avoid partial reads.
- control.json stores two logical sections: latest_action (overwrite-on-write) and feature_toggles (persistent for the run). New control action writes replace latest_action only; feature_toggles are preserved and updated independently. The runner processes latest_action with control_seq > last_applied_control_seq (idempotent).
- Feature toggles are per-run control state stored within control.json (feature_toggles). UI/TUI updates persist only for the current run and apply at the next step boundary/resume boundary; they do not modify repo config or global defaults. UI may display global/repo flags read-only; to persist toggles across runs, update repo config or pass explicit run parameters outside the run.
- Auth + CSRF (minimum, explicit):
  - Runner generates a random control auth token at run start and stores it in a 0600 file (e.g., .runs/<task-id>/cli/<run-id>/control_auth.json).
  - Web UI does NOT read filesystem paths. The runner serves the UI assets and exposes an authenticated same-origin bootstrap endpoint (e.g., GET /auth/session) that issues a short-lived session token (httpOnly cookie or in-memory token).
  - TUI reads the token from the file or an env var override (e.g., CODEX_CONTROL_TOKEN).
  - Tokens are runtime secrets (runner-generated control token + short-lived UI session token); there is no configurable UI auth token setting.
  - Requests without a valid token return 401 and do not modify control.json.
  - Control API binds to 127.0.0.1 by default and enforces same-origin; CORS is disabled unless explicitly enabled.
- Control-plane addressing + auth for delegation server (explicit):
  - Runner writes .runs/<task-id>/cli/<run-id>/control_endpoint.json = { base_url, token_path } (0600).
  - Delegation MCP server derives the run directory from manifest_path and reads control_endpoint.json to reach the runner control API.
  - Delegation server reads the token from token_path and sends it in an Authorization header; it is never passed through model-visible tool arguments or logs.
  - The token file is never exposed to the model or sandbox; delegation server uses it directly when calling runner APIs.

#### 4) Escalation Question Queue (parent run)
Mechanism + API surface:
- Child runs call delegate.question.enqueue (MCP tool) against the delegation server; the runner injects a delegation_token out-of-band (not in model-visible tool inputs).
- The delegation server forwards the request (including delegation_token) to the parent runner via a local, runner-only control endpoint; the parent runner validates token/run linkage and enqueues the question.
- The delegation server resolves the parent run via parent_manifest_path (read control_endpoint.json) to reach the runner control API; parent_task_id/run_id are for audit/display only.
- The parent runner appends question_queued to events.jsonl (single-writer), including expires_at/expires_in_ms when provided, and optionally mirrors a summary into manifest metadata for fast UI queries. UI/TUI should rely on events.jsonl for expiry display; manifest metadata is a cache only.
- Answers are submitted via UI/TUI to the parent runner (control endpoint), which emits question_answered + question_closed and relays the answer to the child runner.
- Child runs can poll via delegate.question.poll (MCP tool) or observe mirrored question_* events in their own events.jsonl (runner relays responses; no direct parent file access).

Lifecycle:
- enqueue -> question_queued emitted in parent (and mirrored to child).
- If auto_pause=true (default), child run pauses at the next step boundary with reason=awaiting_question_answer.
- When answered, parent emits question_answered + question_closed(outcome=answered); child resumes if it was auto-paused.
- If expires_in_ms is reached without an answer, parent emits question_closed(outcome=expired, closed_at, expires_at) and mirrors expiry metadata for UI/TUI visibility.
- Child transition on expiry is governed by delegate.question.expiry_fallback (repo-configured; default "pause"):
  - pause (default): child remains paused with reason=question_expired until an operator responds or manually resumes.
  - resume: child resumes immediately with a null answer (delegate.question.poll returns status=expired, expired_at, fallback_action="resume").
  - fail: child transitions to run_failed with error_code=question_expired.
  UI/TUI must surface the expired status plus the resulting run transition (paused/resumed/failed).

Authz + safety:
- Delegation tokens are scoped to {parent_run_id, child_run_id} and expire with the parent run.
- Parent runner rejects enqueue attempts without a valid token or with mismatched run IDs.
- delegation_token is runner-only and never appears in model-visible tool inputs or events; tool_called payloads must redact it.
- delegation_token is delivered to the delegation server via runner-only request metadata (not tool input fields).
- Question payloads may be stored as artifacts; events reference artifacts when the text is large.

#### 5) Event Stream (events.jsonl)
- Append-only JSONL per run for UI + auditing.
- Event types: run_started, step_started, step_completed, step_failed, tool_called, agent_message, rlm_iteration, rlm_repl_exec, rlm_context_search, rlm_context_peek, rlm_context_chunk_read, rlm_subcall_started, rlm_subcall_completed, rlm_budget_exceeded, rlm_policy_changed, confirmation_required, confirmation_resolved, security_violation, pause_requested, run_paused, run_resumed, run_canceled, run_completed, run_failed.
- Additional event types (question queue): question_queued, question_answered, question_closed.
- Required fields (schema v1):
  - schema_version, seq, timestamp, task_id, run_id, event, actor, payload.
  - Optional: parent_run_id, pipeline, error.
- tool_called payloads must redact sensitive inputs (delegation_token, auth tokens, confirm_nonce, ui.session_token); store only action_params_digest plus a safe summary.
- timestamp format: RFC3339/ISO-8601 UTC (e.g., 2026-01-06T12:00:00Z).
- rlm_policy_changed payload: { old_policy, new_policy, effective_at: "run_start" | "resume_boundary" }.
- rlm_repl_exec payload: { iteration, code_digest, code_artifact?, stdout_artifact?, stderr_artifact?, duration_ms }.
- rlm_context_search payload: { iteration, query, match_count?, output_artifact? }.
- rlm_context_peek payload: { iteration, offset, length, output_artifact? }.
- rlm_context_chunk_read payload: { iteration, chunk_id, length, output_artifact? }.
- rlm_subcall_started payload: { iteration, subcall_id, model, input_chars, purpose, input_artifact? }.
- rlm_subcall_completed payload: { iteration, subcall_id, model, output_chars, duration_ms, output_artifact? }.
- rlm_budget_exceeded payload: { budget_type: "iterations" | "subcalls" | "subcall_depth" | "timeout" | "usd" | "tokens", limit, observed, action: "pause" | "fail" }.
- confirmation_required payload: { request_id, confirm_scope, action_params_digest, digest_alg, confirm_expires_in_ms }.
- confirmation_resolved payload: { request_id, nonce_id, outcome: "approved" | "expired" | "canceled" }.
- question_queued payload: { question_id, parent_run_id, from_run_id, prompt, prompt_artifact?, urgency: "low" | "med" | "high", queued_at, expires_at?, expires_in_ms? }.
- question_answered payload: { question_id, parent_run_id, answer, answer_artifact?, answered_by: "user" | "ui" | "parent", answered_at }.
- question_closed payload: { question_id, parent_run_id, outcome: "answered" | "dismissed" | "expired", closed_at, expires_at? }.
- security_violation payload: { kind, summary, severity: "low" | "med" | "high", related_request_id?, control_seq?, details_redacted: true } (redact secrets, confirm_nonce, auth tokens, and raw blocked paths; use hashes/opaque IDs if needed).
- actor values: runner | ui | user | parent | delegate (extensible).
- Ordering guarantees:
  - Single-writer (runner) appends events.
  - seq is monotonic within a run; append-only with no rewrites.
- Control-related events (pause_requested, run_paused, run_resumed, run_canceled) MUST include request_id and control_seq when the transition is control-driven.
- UI/control endpoints never write events.jsonl directly; they enqueue requests and the runner emits the corresponding events.
- Canonical v1 path: UI consumes runner event-stream endpoint (SSE/WebSocket). events.jsonl tailing is a fallback for diagnostics or a status-ui server proxy; manifest remains canonical summary.
- Large RLM blobs (subcall prompts/outputs, REPL stdout) must be stored as runner-written artifacts (runner_artifacts_dir, not sandbox-writable) and referenced from events.jsonl, not inlined. The only sandbox-readable runner output is the mailbox/inbox (rlm_responses, RO in sandbox).
- Sensitive fields MUST NOT be written to events.jsonl or server logs. Redact or omit:
  - confirm_nonce (store nonce_id + scope digest only)
  - delegation_token
  - ui.session_token (runtime-only)
  - auth tokens, cookies, headers
  - secret env vars passed to child runs
  - raw tool parameters for confirm-required actions (store action_params_digest + safe summary)
- Normative flow examples (golden paths):
  - confirm-to-act (delegate.cancel):
    - tool_called(delegate.cancel w/out nonce) -> confirmation_required -> run_paused(reason=confirmation_required) -> confirmation_resolved(approved) -> run_resumed -> tool_called(delegate.cancel replay) -> run_canceled
  - question queue:
    - tool_called(delegate.question.enqueue) -> question_queued -> run_paused(reason=awaiting_question_answer) -> question_answered -> question_closed(outcome=answered) -> run_resumed
  - pause/resume:
    - tool_called(delegate.pause paused=true) -> pause_requested -> run_paused -> tool_called(delegate.pause paused=false) -> run_resumed

#### 6) Config Layering (Global + Repo)
- Global config: CODEX_HOME/config.toml (or ~/.codex/config.toml)
  - Register MCP server enabled by default (only MCP on by default; disable only when required).
- Global defaults: delegate.allow_nested, delegate.tool_profile, rlm.policy.
- Repo config: .codex/orchestrator.toml
  - Repo-specific overrides, allowlists, and GitHub settings.
- Precedence: CLI flags > env vars > repo config > global config.
  - Exception (GitHub authorization): github.enabled and github.operations are read exclusively from .codex/orchestrator.toml.
    Ignore global config, CLI flags, and env vars for these keys (they must not enable or expand GitHub permissions).
  - Safety-critical keys are repo-capped: higher-precedence layers may only narrow (intersection), never expand (see list below).
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
  - Default when absent: paths.allowed_roots = ["<repo_root>"] (read-only cap for context APIs). If repo config sets an empty list, context APIs deny all filesystem reads.
  - Evaluation algorithm (single source of truth):
    - repo_cap = repo_config.paths.allowed_roots if present; else ["<repo_root>"].
    - candidate = merge(config_layers) for paths.allowed_roots if any layer sets it; else repo_cap.
    - effective_allowed_roots = intersection(repo_cap, candidate).
    - Intersection definition (normative): normalize to absolute, symlink-resolved paths; a candidate root is allowed iff it is equal to or a subpath of at least one repo_cap root (path-prefix semantics, not literal string equality).
      - Example: repo_cap=["/repo"], candidate=["/repo/docs", "/tmp"] => effective_allowed_roots=["/repo/docs"].
    - Result: global/CLI/env can never expand beyond repo_root when repo config is missing.
  - Global denylist applies after allowlist evaluation: .runs/** and control-plane files are always denied, even if under repo_root.
- Repo-cap rule (delegate tool servers):
  - delegate.allowed_tool_servers is defined only in repo config (.codex/orchestrator.toml) and caps which tool servers may be enabled for child runs.
  - Default when absent: delegate.allowed_tool_servers = [] (no tool servers permitted for child runs).
  - Evaluation algorithm (single source of truth):
    - repo_cap = repo_config.delegate.allowed_tool_servers if present; else [].
    - requested_tool_profile = merge(config_layers).delegate.tool_profile if any layer sets it; else repo_cap.
    - effective_tool_profile = intersection(repo_cap, requested_tool_profile) (exact server-name match).
    - Result: global/CLI/env can only narrow by requesting a subset; they can never expand beyond repo_cap. If repo_cap is empty, no tool servers can be enabled for child runs.
- Safety-critical config policy (repo-capped defaults):
  - runner.mode (dev/prod)
  - rlm.environment (e.g., docker vs local REPL)
  - sandbox.network (if configurable)
  - repo mount enablement (if any dev-only mount toggle exists)
  - ui.bind_host (if non-localhost binding is allowed)
  - delegate.tool_profile (tool servers enabled for child runs)
  - Evaluation rules (examples):
    - runner.mode: repo config defines runner.allowed_modes (default ["prod"]); effective_mode must be in allowed_modes (env/CLI selects within allowed set only).
    - rlm.environment: repo config defines rlm.allowed_environments (default ["docker"]); effective_environment must be in allowed_environments.
    - sandbox.network: effective_network = repo_allow_network && requested_network.
    - repo mounts: effective_repo_mounts = repo_allow_mounts && requested_mounts.
    - ui.bind_host: repo config defines ui.allowed_bind_hosts (default ["127.0.0.1"]); effective bind_host must be in allowlist.
    - delegate.tool_profile: repo config defines delegate.allowed_tool_servers (repo-only cap; default [] when missing). requested_tool_profile is the merged delegate.tool_profile (or repo_cap when unset); effective_tool_profile = intersection(repo_cap, requested_tool_profile).
- Example keys (conceptual):
  - delegate.allow_nested, delegate.tool_profile, delegate.mode, delegate.allowed_tool_servers
  - rlm.policy
  - rlm.root_model, rlm.sub_model
  - rlm.max_iterations, rlm.max_subcalls, rlm.wall_clock_timeout_ms
  - rlm.budget_usd, rlm.budget_tokens
  - rlm.environment
  - rlm.allowed_environments
  - runner.mode
  - runner.allowed_modes
  - confirm.auto_pause, confirm.max_pending
  - ui.control_enabled, ui.bind_host
  - ui.allowed_bind_hosts
  - ui.allowed_run_roots
  - github.enabled
  - github.operations (repo-scoped only; ignored outside repo config)
  - paths.allowed_roots

Example config (global):
```toml
[delegate]
allow_nested = false
tool_profile = ["shell", "filesystem", "orchestrator"]
# delegate.allowed_tool_servers is repo-only; omit from global config.

[rlm]
policy = "always"
environment = "docker"
allowed_environments = ["docker"]
max_iterations = 50
max_subcalls = 200
wall_clock_timeout_ms = 1800000 # 30m
# root_model/sub_model optional; defaulting is allowed

[runner]
mode = "prod"
allowed_modes = ["prod"]

[ui]
control_enabled = false
bind_host = "127.0.0.1"
allowed_bind_hosts = ["127.0.0.1"]
```

Example config (repo):
```toml
# NOTE: GitHub authorization is repo-scoped only.
# Configure [github].enabled and [github].operations here (not in global config).
[delegate]
allow_nested = false
allowed_tool_servers = ["shell", "filesystem"]

[github]
enabled = true
operations = ["open_pr", "comment", "merge"]
```

tool_profile entries map to mcp_servers.<name> keys (or named tool groups defined in Codex config).
Example: tool_profile = ["chrome-devtools"] -> mcp_servers.chrome-devtools.enabled=true in the child config.

#### 7) GitHub Integration (first-class, gated)
- Ship GitHub operations in the same MCP server (gated by repo config).
- Prefer gh when installed; fallback to token-based API.
- UI surfaces PR status, checks, and merge controls; destructive actions require confirmation.
- Operations must be explicitly listed in repo config (.codex/orchestrator.toml) as an allowlist per operation; global config cannot grant additional operations.
- Tool exposure model: github.* tools are registered only when repo config sets [github].enabled=true; optionally register only allowlisted operations to keep the tool surface minimal.
- Child-run note: delegate.mode=question_only scopes only delegate.* tools; github.* registration is still controlled by repo policy (tool_profile does not gate github.*), so GitHub tools remain available in question_only child runs when allowlisted.
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

#### 8) Onboarding
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

# open control UI (served by runner)
open http://127.0.0.1:<runner-port>/ui
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
- TECH_SPEC: tasks/specs/0940-delegation-autonomy-platform.md
- Task checklist: tasks/tasks-0940-delegation-autonomy-platform.md

## Open Questions
- Should the control UI live under the existing status UI route or a new entrypoint?
- Should the allowlisted multi-repo view be configurable in the UI or remain config-only in v1?

## Approvals
- Engineering: Pending
- Reviewer: Pending
