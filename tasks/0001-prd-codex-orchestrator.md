# Codex-Orchestrator PRD

## Added by Orchestrator 2025-10-16

## Summary
- **Problem Statement:** Teams using OpenAI Codex across CLI, IDE, and Cloud lack a unified, guardrailed orchestration layer for planning, delegating, and approving multi-phase work across repositories and environments.
- **Desired Outcome:** Deliver a reusable orchestrator that enforces Codex SOPs (one-subtask flow, approvals, diff-first edits) while enabling automation patterns (parallel goals, MCP handoffs) backed by persistent artifacts and learning assets.

## Goals
- Provide a canonical workflow that turns ai-dev-task briefs into PRDs, task lists, specs, and implementation updates with explicit review gates.
- Enable deterministic Codex interactions via MCP and Agents SDK manager/builder/tester roles, including parallel Codex Cloud runs.
- Capture and reuse learnings (codemods, linters, templates, adapters) to accelerate subsequent projects.
- Expose human-friendly mirrors (docs/*) that always point back to the /tasks source of truth.
- Enforce security guardrails: safe approval modes by default, logging, diff artifacts, and secret hygiene.

## Non-Goals
- Replacing Codex CLI/IDE UX; orchestrator wraps official tools instead of re-implementing editors.
- Building proprietary Codex model features beyond orchestration glue.
- Managing billing, seat provisioning, or enterprise admin tasks outside orchestrator scope.

## Stakeholders
- **Product:** Codex program lead defining SOPs and guardrails.
- **Engineering:** Platform engineers implementing orchestrator services, adapters, and evaluation harness.
- **Design:** Developer experience advocate ensuring docs and mirrors stay readable.

## Capabilities & Constraints from Codex Platform
- Codex CLI can read full repositories, stage diffs, request approvals for writes/runs, and integrate with browsers and VS Code; teams can add task instructions and environment hooks to customize flows.¹
- Agents SDK lets developers compose manager agents that coordinate specialist peers, attach tools, and manage shared state and artifacts across long-running tasks.²
- Model Context Protocol (MCP) standardizes tool invocation so Codex can act as an MCP server, enabling deterministic edits/runs from external orchestrators.³
- Codex Cloud offers managed workspaces, approvals, and run/export tooling to execute many Codex tasks in parallel or on schedules without local setup.⁴
- Security guidance requires default read-only approvals, explicit guardrail confirmation for elevated modes, audit logs, and secret hygiene via vault integrations.⁵

## Users & Key Flows
- **Pattern ingestion:** Point Codex at an established repository to harvest codemods, lint rules, and adapter configs into /patterns and /adapters.
- **Bootstrap:** Clone this starter orchestration repo, run Phase 0–D flows to seed PRD, task list, spec(s), action plan, and initial scaffolding.
- **Parallel delivery:** Use Codex Cloud to launch multiple orchestrated tasks concurrently (e.g., builder, tester, reviewer roles) while preserving per-task approvals and logs.
- **Review loop:** Human approvers inspect generated artifacts (diffs, metrics, evaluation reports) before promoting tasks from planned → in-progress → done.

## Functional Requirements
- Implement SOP phases (Scaffold Check, PRD, Task List, Spec, Action Plan, Implementation) with automatic state tracking in /tasks/index.json.
- Generate canonical artifacts under /tasks and mirrored docs/* snapshots appended with dated sections without overwriting prior content.
- Provide scripts for local MCP server start (`scripts/run-local-mcp.sh`), parallel Codex Cloud goals (`scripts/run-parallel-goals.ts`), and spec guard enforcement (`scripts/spec-guard.sh`).
- Maintain learning assets libraries: codemods, linters, templates, adapters, evaluation harness with fixtures.
- Integrate Agents SDK manager that delegates to builder/tester/reviewer agents, supporting both local MCP sessions and Codex Cloud delegations.
- Persist run metadata, logs, and diff artifacts to /.runs or /out for auditing.
- Enforce mini-spec gating per SOP triggers (cross-service, security, migrations, novel patterns) before implementation subtasks touch affected files.

## Non-Functional Requirements
- **Reliability:** Orchestrator processes must resume safely after interruptions with idempotent artifact updates.
- **Observability:** Logs, traces, and approvals stored with timestamps/user context; integrate with Codex Cloud run exports when available.
- **Scalability:** Support parallel execution of ≥10 Codex tasks without contention on shared artifacts.
- **Usability:** Clear prompts, dated append-only updates, and mirrors readable without tooling knowledge.
- **Compliance:** Respect enterprise guardrails, secret isolation, and approval policies; document deviations.

## Security & Authority Model
- Default to safe approval modes (read/edit/run/network) mirroring Codex CLI behavior; require explicit human confirmation for full-access sessions.¹⁻⁵
- Centralize credential usage via MCP tool configuration; never store raw secrets in repo.
- Log all elevated actions with justification, referencing SOP guardrails.
- Ensure spec guard checks block commits when required specs missing/stale (last_review > 30 days).

## Success Metrics
- 100% of orchestrated tasks include PRD, task list, and (when triggered) mini-spec before implementation begins.
- ≥90% of automation runs complete without manual fixups after initial orchestration (tracks maturity of patterns/adapters).
- Reduction of duplicated edits by ≥50% compared to ad-hoc Codex usage (measured via diff overlap in /.runs history).
- Time to bootstrap new repo ≤1 hour from Phase 0 start to approved action plan.

## Risks & Mitigations
- **New SOP adoption friction:** Provide clear checklist artifacts and scripts, plus sample walkthroughs in docs/TECH_SPEC.md and docs/ACTION_PLAN.md.
- **Tool drift vs official Codex features:** Monitor OpenAI release notes; design adapters to be modular and versioned.
- **Parallel run conflicts:** Use per-task worktrees or sandboxed Codex Cloud runs; enforce lock files for shared assets.
- **Security regression:** Integrate spec-guard CI workflow and require approvals before enabling danger-full-access modes.

## Open Questions — Resolved 2025-10-16
- **Evaluation dashboard sync:** Resolved by the cloud-sync worker uploading run manifests (including evaluation outputs) to Codex Cloud using manifest hashes for idempotency. Dashboards consume the same payload and link back to `.runs/<task>/<run>/manifest.json`.
- **SLA alerts for long-running runs:** Resolved with a weekly reviewer audit using `.runs/**/manifest.json` durations and Codex Cloud run metadata. Automated alerting is deferred; governance playbooks mandate manual review until production telemetry warrants automation.

## Approvals
- **Product:** Approved 2025-10-16 (Jordan Lee)
- **Engineering:** Approved 2025-10-16 (Priya Desai)
- **Design:** Approved 2025-10-16 (Mateo Alvarez)
- **Status Update:** Approved per log below.

### Approval Log — 2025-10-16
- Product — Jordan Lee (Approval recorded 2025-10-16 21:45 UTC via safe approval mode)
- Engineering — Priya Desai (Approval recorded 2025-10-16 22:05 UTC via safe approval mode)
- Design — Mateo Alvarez (Approval recorded 2025-10-16 22:20 UTC via safe approval mode)
- Audit Trail: Governance approvals captured in this section for Phase Gate G1 and mirrored in docs/PRD.md; safe-mode run ID GOV-0001-PRD-20251016 retained in Codex CLI session notes.

---
¹ OpenAI, “Connect your code to Codex.” https://developers.openai.com/codex/build/codex  
² OpenAI, “Agents SDK overview.” https://developers.openai.com/codex/guides/agents-sdk  
³ OpenAI, “Model Context Protocol.” https://developers.openai.com/docs/guides/mcp  
⁴ OpenAI, “Bringing Codex to every developer.” https://openai.com/index/bringing-codex-to-every-developer/  
⁵ OpenAI, “Codex Security Admin guide.” https://developers.openai.com/codex/guides/security-admin

## Added by PRD Author 2025-10-18

### Problem Statement & Goals
- Codex-Orchestrator must offer a deterministic Agents-SDK MCP runner workflow so builder/tester/reviewer agents can trigger, monitor, and audit long-lived runs without leaving the Codex CLI (source alignment: `scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-start.sh`, `.agent/readme.md`; validate exact line refs during spec draft).
- Goals
  - Ensure every MCP-triggered execution persists its manifest and logs under `.runs/0001/mcp/<run-id>/` while emitting a compatibility pointer under `.runs/local-mcp/<run-id>/` so legacy tooling continues to function. Manifest schema must include heartbeat/resume metadata and metrics bookkeeping.
  - Provide end-to-end automation so `codex mcp-server` sessions launched via `scripts/run-local-mcp.sh` reliably register edit/git/run capability and surface diagnostics to reviewers inside the run manifest.
  - Reduce reviewer replays: 95% of orchestrator tickets should be reviewable from run artifacts alone (no manual reruns). Track via the task-scoped telemetry artifacts (`.runs/0001/metrics.json` JSONL + `.runs/0001/metrics-summary.json`).
  - Keep spec-guard checks in the default command sequence so every MCP-driven implementation run captures `bash scripts/spec-guard.sh --dry-run` alongside build/lint/test results; document any stricter enforcement (such as 24-hour freshness windows) as a follow-up enhancement.

### Non-Goals / Out of Scope
- Implementing new Codex CLI UX beyond MCP runner orchestration (defer to CLI team).
- Changing approval policy defaults or manifest schema outside Task 0001.
- Designing evaluation harness scenarios (`evaluation/` ownership stays with Evaluation WG).
- Cloud execution optimizations unless `tasks/tasks-0001-codex-orchestrator.md` explicitly flags `execution.parallel=true`.

### User Workflows & MCP Integration
#### Builder Agent Happy Path
1. Run `scripts/run-local-mcp.sh` to start `codex mcp-server` with repo workspace (mirrors the setup already exercised by the runner).
2. Invoke the runner via `scripts/mcp-runner-start.sh [--command "<cmd>"] --approval-policy never --timeout 3600`. The wrapper simply forwards to `scripts/agents_mcp_runner.mjs start` and prints the generated `run_id`, task-scoped `artifact_root` (e.g. `.runs/0001/mcp/<run-id>`), and the manifest path.
3. Poll status using `scripts/mcp-runner-poll.sh <run_id> [--watch]`; update `/tasks/tasks-0001-codex-orchestrator.md` checklist item with `[x] <YYYY-MM-DD> .runs/0001/mcp/<run-id>/manifest.json` and reference the compatibility pointer under `.runs/local-mcp/<run-id>/` for legacy auditors.
4. On success, `scripts/agents_mcp_runner.mjs` writes `manifest.json`, `runner.log`, per-command response JSON files, `.heartbeat`, and `.resume-token` under `.runs/0001/mcp/<run-id>/`, then appends to `.runs/0001/metrics.json`.

#### Builder Failure Scenarios
- **Timeout**: `scripts/agents_mcp_runner.mjs` passes the `--timeout` value through to `clientSessionTimeoutSeconds` (default 3600s). Runs that exceed the allowance terminate with `status=failed` and the last command marked `failed`. Lower timeout targets (e.g., 900s) require explicit configuration and are tracked as a follow-up enhancement.
- **Detached Run**: Heartbeat timestamps are refreshed every ≤10 seconds. `scripts/mcp-runner-poll.sh` surfaces `status_detail=stale-heartbeat` when the heartbeat age exceeds 30 seconds, and `scripts/mcp-runner-start.sh --resume <run-id>` reattaches using the stored `.resume-token` while appending a `resume_events[]` entry to the manifest.
- **Malformed Tool Response**: When the Codex tool returns non-JSON or exits non-zero, the runner records the failure in the command entry (`status=failed`, `summary` describing the error) and surfaces `manifest.status=failed`. The runner also writes `errors/<index>-<slug>.json` with the raw tool payload, exit metadata, and summary and references it from `manifest.commands[].error_file` for reviewer triage.

#### Tester Agent Workflow
1. Read `.runs/0001/mcp/<run-id>/manifest.json` (or the `.runs/local-mcp/<run-id>/` pointer) to confirm required commands (`npm run build`, `npm run lint`, `npm run test`, `bash scripts/spec-guard.sh --dry-run`) executed in-order; queue additional commands with `--command` flags when gaps exist.
2. Attach test logs to `.runs/0001/mcp/<run-id>/test-<slug>.log` (retaining a reference from the manifest for reviewer convenience).
3. Update `/tasks/tasks-0001-codex-orchestrator.md` tester checklist upon completion.

#### Reviewer Agent Workflow
1. Verify manifest timestamps, approvals, and guardrails already satisfied.
2. Cross-check mirrors (`docs/ACTION_PLAN.md`, `docs/PRD.md`, `docs/TECH_SPEC.md`) using MCP `read` tool to confirm they mirror `/tasks/**`.
3. Only approve when all checklists track `[x]` with evidence links and `spec-guard` recency <30 days.

### Functional Requirements
- Runner invocation: `scripts/mcp-runner-start.sh` remains a thin wrapper over `scripts/agents_mcp_runner.mjs start`, supporting `--command` (repeatable), `--approval-policy`, `--timeout`, and `--format` (text|json). Document the default command queue (`npm run build`, `npm run lint`, `npm run test`, `bash scripts/spec-guard.sh --dry-run`).
- Manifest contract: persist run state at `.runs/0001/mcp/<run-id>/manifest.json` with the extended fields (`runner`, `script`, `status`, `status_detail`, `commands[]`, `started_at`, `updated_at`, `completed_at`, `run_id`, `repo_root`, `approval_policy`, `timeout_seconds`, `runner_pid`, `runner_log`, `task_id`, `artifact_root`, `compat_path`, `heartbeat_at`, `heartbeat_interval_seconds`, `heartbeat_stale_after_seconds`, `resume_token`, `resume_events[]`, `metrics_recorded`). Each command entry must include index, command, status, timestamps, exit_code, summary, manifest_path (when provided by the tool), and response_file.
- Logging: keep `runner.log` and per-command response JSON files alongside the manifest. Any new artifact types (diff patches, diagnostics) require corresponding runner updates and should be tracked as enhancements before spec sign-off.
- Polling: `scripts/mcp-runner-poll.sh` reads the manifest and prints human-readable status; support `--watch` and `--interval`. JSON status output is a stretch goal and should be captured under Open Questions until implemented.
- Guardrails: the default command list must retain `bash scripts/spec-guard.sh --dry-run`; if callers omit it, the manifest should flag the missing guardrail for reviewer attention (implementation detail for the upcoming spec).
- Approval policy: the runner passes `--approval-policy` directly to the Codex MCP tool (default `never`). Any attempt to escalate without human approval must fail fast and record the reason in the manifest summary.
- Error handling: on tool failures the runner records the failure in the command entry and sets `manifest.status=failed`. Automated retry/backoff is not implemented; evaluating exponential backoff belongs in Open Questions.

### Operational Guardrails
- Timeout default remains 3600 seconds (current runner behavior). If the program wants a stricter 900-second default, capture it as a required code change in the upcoming spec.
- Automated retry/backoff is out of scope for the existing runner; failures short-circuit the command queue. Evaluate transient-error retries as an enhancement.
- Manifest consistency: keep atomic writes via `.tmp` rename (already implemented in `writeJsonAtomic`).
- Spec guard enforcement: rely on the default command queue including `bash scripts/spec-guard.sh --dry-run`; reviewers must block runs where the guardrail command is missing or failed.
- Checklist synchronization: `/tasks/tasks-0001-codex-orchestrator.md` and mirrors in `docs/` must be updated in the same change set with completion date plus manifest path.
- MCP diagnostics: `scripts/run-mcp-diagnostics.sh` remains a manual follow-up tool; automatic invocation after failures is a future enhancement to be evaluated.

### Open Questions & Risks
- How to resume detached runs without duplicate manifests? Need policy for `resume_token` storage.
- Validate telemetry retention policy for `.runs/0001/metrics.json` (JSONL) and `.runs/0001/metrics-summary.json` to prevent unbounded growth; document pruning cadence in the architecture spec.
- Document the exact code paths governing timeouts and error handling (`scripts/agents_mcp_runner.mjs:70-180`) so mirror docs stay accurate if behavior changes.
- Risk of manifest bloat when logs are large; consider log rotation or compression (out of scope unless mandated).
- Confirm Agents SDK version compatibility and pinning in `package.json` to avoid breaking changes.

### Acceptance Criteria
1. Running `scripts/mcp-runner-start.sh --approval-policy never --timeout 3600 --format json` returns a JSON payload containing `run_id`, `artifact_root`, `compat_path`, and `manifest`, and creates `.runs/0001/mcp/<run-id>/` artifacts plus the legacy pointer under `.runs/local-mcp/<run-id>/`.
2. The manifest records the default command queue (`npm run build`, `npm run lint`, `npm run test`, `bash scripts/spec-guard.sh --dry-run`) with each entry’s `status` transitioning from `pending` → `running` → `succeeded`, and refreshes `heartbeat_at` every ≤15 seconds.
3. `scripts/mcp-runner-poll.sh <run-id> --watch --interval 5` streams human-readable updates, including `status_detail=stale-heartbeat` when the heartbeat age exceeds 30 seconds.
4. Invoking `scripts/mcp-runner-start.sh --resume <run-id>` after terminating the runner process reattaches via the stored `.resume-token`, updates `manifest.runner_pid`, and appends a `resume_events[]` entry.
5. Upon run completion, `.runs/0001/metrics.json` gains a new JSONL record with guardrail coverage, durations, and status; executing `node scripts/mcp-runner-metrics.js` rewrites `.runs/0001/metrics-summary.json` with updated success and coverage statistics.
6. Checklist entries in `/tasks/tasks-0001-codex-orchestrator.md` and mirrors (`docs/ACTION_PLAN.md`, `docs/PRD.md`) flip to `[x]` with completion date and the `.runs/0001/mcp/<run-id>/manifest.json` path in the same change set.
7. Reviewer confirms mirror accuracy: `docs/PRD.md` summarizes the canonical section without introducing behaviors not present in the manifest or runner scripts.
