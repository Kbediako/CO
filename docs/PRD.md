# Product Requirements — Codex Orchestrator CLI Migration (Task 0101)

## Vision
- Replace the MCP runner with a first-class Codex Orchestrator CLI that agents and reviewers can run locally without MCP dependencies.
- Preserve durability guarantees for manifests, metrics, and lineage so existing automation (review flow, spec guard, diagnostics) keeps working.
- Provide a consistent developer experience across local CLI and cloud execution modes by centering the TaskManager in both paths.

## Success Metrics
- 100% of automation formerly wired to `scripts/agents_mcp_runner.mjs` works through the new CLI commands (`start`, `resume`, `status`).
- Run manifests store under `.runs/0101/cli/<run-id>/manifest.json` with compatibility pointers for `.runs/0101/mcp/<run-id>/` within ±1 second of run completion.
- Metrics recorder appends JSONL entries for every terminal run and surfaces guardrail coverage ≥90% across rolling seven-day window.
- Diagnostics CLI finishes the default pipeline (`build`, `lint`, `test`, `spec-guard`) in ≤30 minutes on reference hardware without manual intervention.
- Task state snapshots under `out/0101/state.json` align with manifest history for at least three consecutive runs (verified via integration test).

## User Stories
- **Platform engineer:** As a platform engineer, I can invoke `codex-orchestrator start diagnostics` to execute the full guardrail pipeline and share the resulting manifest with reviewers.
- **Reviewer:** As a reviewer, I can run `codex-orchestrator status <run-id> --format json` to fetch heartbeat, metrics presence, and sub-run lineage without rehydrating MCP sessions.
- **Agent author:** As an agent author, I can embed the CLI as a sub-command when spawning nested agents so the parent manifest records `parentRunId` relationships automatically.

## Risks & Mitigations
- **Process drift:** New CLI may diverge from approved guardrail sequence. *Mitigation:* encode pipeline definitions in versioned config and cover with integration tests.
- **Manifest regression:** Persistence bugs could drop metrics or lineage. *Mitigation:* reuse TaskManager persistence coordinator and add schema validation during writes.
- **Adoption friction:** Scripts and docs might still point to MCP runner. *Mitigation:* provide shims that delegate to the CLI and update documentation in `/docs`, `/tasks`, and `.agent/`.
- **Performance:** Running the pipeline through TaskManager could add overhead. *Mitigation:* stream command output directly to disk and update heartbeat on a 5s cadence to expose stalls early.

## Non-Goals
- Supporting remote execution beyond the existing cloud sync worker (cloud parity is tracked in a follow-on task).
- Redesigning the TaskManager agent interfaces or migrating to a different logging backend.
- Shipping UI dashboards; scope is limited to CLI tooling plus manifests.

## Launch Criteria
- PRD, technical spec, action plan, and mirrored task checklist show `[x]` status with manifest links for planning, implementation, testing, and documentation milestones.
- Passing runs for `scripts/spec-guard.sh --dry-run`, `npm run lint`, `npm run test`, and `npm run review`, each recorded under `.runs/0101/` with metrics entries.
- Integration tests cover CLI start/resume/status flows, manifest structure, task state snapshots, and compatibility pointers.
- Shims (`scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-*.sh`) call into the new CLI without referencing MCP SDKs.
- Documentation (`docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`, `/tasks`, `.agent/`) mirrors the same task status and run artifacts.

## Open Questions
- Do we need additional pipelines (e.g., minimal smoke vs. full guardrail) for faster iteration, or is diagnostics-only acceptable for v1?
- Should the CLI expose JSON schemas for manifests so other tooling can validate without TypeScript types? (Tracked for follow-up if reviewers request.)
