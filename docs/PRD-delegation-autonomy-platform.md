# PRD - Codex Delegation Autonomy Platform (Task 0940)

## Summary
- Problem Statement: Codex lacks a first-class delegation tool surface, a unified control UI, and a default autonomy policy that is auditable and steerable across multiple repos.
- Desired Outcome: Ship a plugin-style MCP server plus UI (web + TUI) that enables delegate.spawn, always-on RLM reasoning, and real-time observability with user-controlled feature flags and GitHub workflow support.
- Definition (RLM): In this PRD, "RLM" means a REPL/sandbox-driven inference loop where large context (repos/docs/logs) lives outside the model context window and is inspected programmatically (peek/search/chunk), with optional recursive sub-calls over snippets for semantic work. It is not "just a longer prompt" or summarization-only.

## Goals
- Provide a minimal delegation MCP tool surface (delegate.spawn, delegate.status, delegate.pause (pause/resume via paused=true/false), delegate.cancel) that Codex can enable per run; GitHub tools remain optional and repo-gated.
- Default to delegation-first behavior: top-level Codex coordinates, delegates deeper work, and stays focused on oversight.
- Make RLM the default autonomy runtime for delegated work: externalize long context into a sandboxed REPL environment, enable programmatic context inspection, and allow recursive sub-calls over constructed snippets.
- Ship baseline RLM safety controls (iteration/subcall/time budgets) so long-context delegation cannot run away.
- Deliver a real-time UI (web + TUI) with run visibility, progress, agent interactions, and run controls.
- Preserve the existing read-only status UI baseline; control features are explicitly opt-in.
- Support global and per-repo feature toggles with clear scope and explicit confirmations.
- Include first-class GitHub workflow support (PRs, reviews, checks, merge) behind repo-scoped flags.
- Provide onboarding flows for self-serve users and Codex-assisted setup.

## Non-Goals
- Optimizing for latency or token cost in the initial release.
- Multi-tenant remote hosting or external auth services.
- Bundling browsers, GitHub credentials, or external MCP servers into the package.
- Replacing the existing orchestration pipelines or manifest schema in this phase.
- Implementing async/parallel RLM sub-calls in v1 (sequential is acceptable initially).
- Deep recursion beyond one level of sub-calls or nested delegation as a default behavior.
- Cloud-hosted sandbox providers as a hard dependency (local Docker sandbox is sufficient for v1).

## Stakeholders
- Product: Codex Orchestrator Platform
- Engineering: Orchestrator Core + Autonomy
- Design: Control UI

## Metrics & Guardrails
- Primary Success Metrics:
  - Users can install once and see delegate tools available in Codex when starting a run with mcp_servers.delegation.enabled=true (disabled by default otherwise).
  - Delegated runs are auditable via manifests + event streams, with UI reflecting live status within 2-5s.
  - RLM runs by default on every delegated pipeline without manual toggles.
  - Users can pause/resume/cancel runs from the UI or TUI.
  - GitHub workflow actions succeed when enabled and are blocked when repo config disallows them.
- Guardrails / Error Budgets:
  - Delegate tools are disabled by default and only enabled per run.
  - UI actions require explicit confirmation for destructive operations.
  - Repo allowlists prevent unsafe filesystem access.
  - paths.allowed_roots cannot be expanded by global/CLI/env config beyond repo policy (repo is the cap).
  - RLM runaway prevention: every delegated run enforces caps (max_iterations, max_subcalls, wall-clock timeout).
  - RLM code execution is isolated by default (Docker sandbox); local/in-process REPL is dev-only.
  - RLM traces are auditable: users can inspect searches, chunk access, and sub-calls in the UI timeline.
  - The sandboxed RLM environment must not have read or write access to events.jsonl, manifest.json, or control.json; these files are not mounted into the sandbox.
  - All context.* access and model subcalls are mediated by runner-controlled APIs (or file-mediated requests); the sandbox has no direct repo mount and no outbound internet.
  - File-mediated sandbox ↔ runner mediation uses a hardened mailbox with separate outbox/inbox and unidirectional permissions; runner treats sandbox-written files as untrusted input, never follows symlinks/hardlinks, and never writes into sandbox-writable directories.
  - Only the runner may write events.jsonl (enforced by filesystem mounts/permissions, not just convention).
  - Nonce signing/minting keys are runner-only. UI/TUI approves by request_id; the runner mints confirmation nonces scoped to the exact action, short-lived, and single-use.
  - Confirmation nonces must never be exposed to the REPL/sandbox filesystem or stdout and must not be written into events.jsonl (log nonce_id only).

## Acceptance Criteria
- Delegate tools are available only when the MCP server is enabled per run; disabled by default globally.
- Pause/resume/cancel semantics are defined and consistent with the tool surface.
- events.jsonl has a documented schema, ordering guarantees, and a single-writer policy.
- RLM is always-on by default for delegated runs; policy override rules and timing are documented.
- Read-only status UI remains the default; control features are gated behind explicit enablement.
- GitHub operations execute only when explicitly allowlisted in .codex/orchestrator.toml; global/CLI/env config cannot grant operations.
- Destructive operations (e.g., github.merge, delegate.cancel) require confirm-to-act regardless of invocation path (UI/TUI or tool call).
- Confirm-to-act is implemented via a runner-minted nonce after UI/TUI confirmation; UI/TUI approves by request_id (not by passing the nonce).
- Confirm-to-act nonce is operation-scoped, short-lived, and single-use; it cannot be reused across actions.
- confirmation_required responses include request_id, confirm_scope, action_params_digest, digest_alg, and confirm_expires_in_ms; UI/TUI can list pending confirmable actions by request_id.
- Pending confirm-to-act requests are discoverable in the UI/TUI via events or manifest metadata, with request_id, action summary, and action_params_digest.
- Unknown GitHub operation IDs are denied by default (no best-effort fallbacks).
- The sandboxed RLM environment must not be able to read or write control.json, events.jsonl, or manifest.json; confirm-to-act nonces are never exposed to the sandbox.
- RLM trace visibility requires context access via instrumented APIs; direct filesystem reads are not supported in production.
- RLM long-context handling does not require stuffing full repo/doc corpora into the model prompt; it uses programmatic inspection + snippet sub-calls and can operate over contexts beyond the model window.
- RLM budget enforcement: if budgets are exceeded, the run transitions to a defined terminal/paused state with an actionable UI message (rlm_budget_exceeded) and no further subcalls are made.
- RLM trace visibility: the UI can show a per-run RLM trajectory (iterations, subcalls, key searches) with large blobs stored as artifacts and referenced from events.jsonl.
- Onboarding includes self-serve and Codex-assisted setup flows with copy-paste commands.

## User Experience
- Personas:
  - Codex power user coordinating multiple repos.
  - Operator monitoring long-running delegated tasks.
  - Developer who wants one-command setup.
- User Journeys:
  - User asks Codex to delegate. Codex spawns a delegate run with minimal MCP config and RLM on by default.
  - User opens the web UI to see live progress, agent exchanges, and current stage.
  - User pauses a run, changes RLM policy, and resumes with updated constraints.
  - User enables GitHub actions for a specific repo and delegates a PR workflow.

## Technical Considerations
- Extend the existing status UI (packages/orchestrator-status-ui) into a control center with live events and run actions.
- Add a dedicated run event stream (events.jsonl) to power progress, agent interactions, and UI timelines.
- Enable delegate tools per run via: codex -c 'mcp_servers.delegation.enabled=true' ... (sole enable gate).
- Child runs spawned by delegate.spawn use explicit minimal tool profiles (enable only required mcp_servers.<tool_server>.enabled=true entries) and do not include delegation tools unless nested delegation is explicitly allowed.
- Store feature flags globally in Codex config and override per repo via .codex/orchestrator.toml.
- Provide a delegation-first skill to bias top-level Codex toward using delegates.
- Secure the local control plane (localhost bind, auth token, CSRF protection, confirm-to-act UX).
- Disable nested delegation by default unless explicitly enabled.

## Documentation & Evidence
- Tech Spec: docs/TECH_SPEC-delegation-autonomy-platform.md
- Action Plan: docs/ACTION_PLAN-delegation-autonomy-platform.md
- Task checklist: tasks/tasks-0940-delegation-autonomy-platform.md
- Mini-spec: tasks/specs/0940-delegation-autonomy-platform.md

## Decisions
- RLM runs by default for every delegated run.
- Delegate tools are minimal and disabled by default in global config.
- UI includes run controls and feature toggles (global + repo).
- GitHub integration is first-class but gated by repo config.

## Open Questions
- Should we support an operator-only view even when controls are enabled globally?
- Should we split GitHub tools into a separate MCP server later for isolation?

## Approvals
- Product: Pending
- Engineering: Pending
- Design: Pending
