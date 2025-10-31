# Product Requirements — Codex Orchestrator Wrapper

## Vision
- Provide a single orchestrator repository that can manage diagnostics, guardrails, and review flows for multiple downstream codebases.
- Preserve durability guarantees for manifests, metrics, and lineage regardless of which project is active so automation remains trustworthy.
- Offer a consistent developer experience across local CLI and cloud execution modes while allowing per-project customization of pipelines.

## Success Metrics
- Every onboarded project runs through `codex-orchestrator` commands (`start`, `resume`, `status`) without MCP dependencies.
- Run manifests persist under `.runs/<task-id>/cli/<run-id>/manifest.json` with compatibility pointers in `.runs/<task-id>/mcp/<run-id>/` within ±1 second of run completion.
- Metrics recorder appends JSONL entries for all terminal runs and surfaces guardrail coverage ≥90% per project over a rolling seven-day window.
- Diagnostics pipeline (`build`, `lint`, `test`, `spec-guard`) completes in ≤30 minutes on reference hardware for each project, or publishes a per-project SLA if different.
- Task state snapshots under `out/<task-id>/state.json` align with manifest history across at least three consecutive runs for every active project.

## User Stories
- **Platform engineer:** I can onboard a new downstream project by creating `packages/<project>`, exporting `MCP_RUNNER_TASK_ID=<task-id>`, and capturing the diagnostics manifest path for reviewers.
- **Reviewer:** I can open `codex-orchestrator status <run-id> --format json` and trace approvals, guardrail outcomes, and lineage without parsing multiple project-specific conventions.
- **Agent author:** I can spawn nested agents or pipelines for a project while maintaining correct `parentRunId` lineage in manifests so cross-project workflows remain auditable.

## Risks & Mitigations
- **Process drift:** Project-specific pipelines might diverge from approved guardrail sequences. *Mitigation:* encode defaults in versioned config, require manifest links in checklists, and cover with integration tests.
- **Manifest regression:** Incorrect task ids could route artifacts to the wrong directory. *Mitigation:* document `MCP_RUNNER_TASK_ID` usage prominently and add validation in reviewer scripts.
- **Adoption friction:** Teams may keep referencing single-project docs. *Mitigation:* maintain multi-project templates in `/docs`, `/tasks`, and `.agent/` with clear instructions for linking manifests.
- **Performance:** Heavier downstream builds may exceed guardrail thresholds. *Mitigation:* capture per-project SLAs and log durations in metrics for trend analysis.

## Non-Goals
- Delivering UI dashboards or new persistence backends (tracked separately).
- Replacing downstream build/test tooling; wrapper focuses on orchestration and documentation guardrails.
- Managing cloud override policies beyond recording them in manifests.

## Launch Criteria
- PRD, technical spec, action plan, and mirrored task checklist show `[x]` status with manifest links for planning, implementation, testing, and enablement milestones per project.
- Passing runs for `scripts/spec-guard.sh --dry-run`, `npm run lint`, `npm run test`, and `npm run review` (or approved alternatives) are captured under `.runs/<task-id>/` with metrics entries for each project.
- Integration tests cover CLI start/resume/status flows, manifest schema validation, and compatibility pointers for multi-project inputs.
- Shims (`scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-*.sh`) call into the CLI without hardcoding project ids while preserving backwards compatibility.
- Documentation (`docs/**`, `/tasks`, `.agent/`) mirrors the same task status, manifest evidence, and approval records.

## Open Questions
- Should we codify lightweight pipelines (e.g., smoke vs. diagnostics) per project, or rely on project owners to declare them in config?
- Do reviewers need an aggregated manifest index across projects, or is the `.runs/<task-id>/cli/` hierarchy sufficient?
