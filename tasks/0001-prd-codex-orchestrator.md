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

## Open Questions
- How should orchestrator sync evaluation results back into Codex Cloud dashboards?
- Do we need automated SLA alerts for long-running Codex tasks, or is manual review sufficient initially?

## Approvals
- **Product:** Pending (2025-10-16)
- **Engineering:** Pending (2025-10-16)
- **Design:** Pending (2025-10-16)
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
