# PRD - CO: Fix delegation MCP startup/perf and stale delegate-server process lifecycle

## Added by Bootstrap 2026-04-13

## Traceability
- Linear issue: `CO-168` / `e1c9b7e2-b142-465e-972d-b9b280cb6cdb`
- Linear URL: https://linear.app/asabeko/issue/CO-168/co-fix-delegation-mcp-startupperf-and-stale-delegate-server-process
- Related issues: `CO-164`, `CO-165`

## Summary
- Problem Statement: CO still has an MCP-health blind spot around delegation startup and lifecycle. `delegation setup` plans the slow wrapper form (`codex-orchestrator delegate-server`), while live startup evidence shows the direct dist entrypoint answers `initialize` quickly and the wrapper path can miss the handshake window. Separately, stale delegate-server processes can accumulate without a bounded CO-owned inspection and cleanup surface.
- Desired Outcome: setup, doctor, and recovery docs all agree on a fast MCP-safe delegation transport; doctor reports startup/handshake health plus stale-process posture; operators get a bounded cleanup path without manual process-table spelunking.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-168` in this provider-worker workspace by fixing the delegation MCP registration/runtime surfaces so normal delegated runs do not hit startup-incomplete warnings, while making stale delegate-server buildup observable and recoverable through CO-owned tooling and docs rather than manual `ps` investigation.
- Success criteria / acceptance:
  - `codex mcp get delegation` or `codex-orchestrator doctor` reports a fast, MCP-safe delegation command
  - a fresh delegation/subagent path no longer shows the startup-incomplete warning under normal conditions
  - stale delegate-server buildup is observable with a safe cleanup/remediation path
  - the lane stays bounded away from broad control-host refactors and preserves linkage to `CO-164` / `CO-165`
- Constraints / non-goals:
  - do not weaken delegation guard behavior
  - do not change provider worker admission or generic control-host cleanup semantics beyond what delegation MCP lifecycle health needs
  - do not turn this into a broad runtime/bootstrap redesign

## Intent Checksum
- Exact user wording / phrases to preserve:
  - "Fix delegation MCP startup/perf and stale delegate-server process lifecycle"
  - "durable health check/doctor signal"
  - "stale delegate-server accumulation is observable and has a safe cleanup/remediation path"
- Protected terms / exact artifact and surface names:
  - `delegation`
  - `delegate-server`
  - `codex mcp get delegation`
  - `codex-orchestrator doctor`
  - `codex-orchestrator delegation setup`
  - `CO-164`
  - `CO-165`
- Nearby wrong interpretations to reject:
  - "just document the manual kill command and leave setup/doctor unchanged"
  - "fix all provider-worker or control-host orphan cleanup in this lane"
  - "we can accept any delegation command as long as the config entry exists"

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth:
  - `delegation setup --format json` still plans `codex mcp add delegation -- codex-orchestrator delegate-server --repo ...`
  - current `doctor` only checks that `mcp_servers.delegation` exists and still advertises the wrapper-style manual command
  - current live `codex mcp get delegation --json` can already point at the fast direct dist entrypoint
  - active delegate-server processes can be legitimate children of live `codex` sessions, so cleanup must distinguish active chains from orphaned leftovers
- Reference truth:
  - delegation MCP stdio startup should use a fast transport that returns `initialize` within the normal Codex startup window
  - CO doctor should show whether the configured command is MCP-safe and whether stale delegate-server processes are accumulating
  - operators should have a bounded CO-owned remediation path instead of manual process-table inspection
- Target truth / intended delta:
  - setup/readiness/manual guidance all prefer the direct dist-backed delegation command for MCP stdio
  - doctor reports the configured command, initialize probe outcome, and stale orphaned delegate-server posture
  - a bounded cleanup command or equivalent CO-owned remediation path handles orphaned stale delegate-server chains safely
- Explicitly out-of-scope differences:
  - generic control-host orphan cleanup beyond delegation MCP leftovers
  - delegation-guard policy changes
  - unrelated provider-worker review, merge, or admission workflow changes

## Not Done If
- `delegation setup` still prefers the slow wrapper form for MCP stdio.
- `doctor` can still report delegation as healthy without verifying command safety or startup/handshake behavior.
- stale delegate-server leftovers remain invisible or require manual `ps` filtering to clean up.
- the lane drifts into unrelated `CO-164` / `CO-165` control-host work instead of staying bounded to delegation MCP lifecycle health.

## Goals
- Make delegation MCP setup/register paths produce an MCP-safe direct command instead of the wrapper form.
- Add a doctor-visible delegation health signal for command classification, startup/initialize timing, and stale-process posture.
- Provide a safe bounded cleanup/remediation path for orphaned stale delegate-server chains.
- Add focused regression coverage and update the operator-facing recovery docs.

## Non-Goals
- Reworking the whole bootstrap/source-authority model for every CLI surface.
- Broadening provider-worker or control-host lifecycle cleanup ownership beyond delegation MCP leftovers.
- Weakening delegation guard or nested delegation policy.

## Stakeholders
- Product: CO operators and provider-worker owners
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - doctor or `codex mcp get delegation` shows an MCP-safe direct command
  - initialize probe reports fast startup for the configured command
  - stale orphaned delegate-server chains are surfaced with bounded cleanup guidance
- Guardrails / Error Budgets:
  - no delegation-guard weakening
  - no false-positive cleanup of currently parented active delegate-server processes
  - no broad control-host/process-lifecycle policy rewrite

## User Experience
- Personas: operator diagnosing delegation MCP failures, provider-worker owner, reviewer checking delegation readiness
- User Journeys:
  - operator runs `codex-orchestrator doctor` and immediately sees whether delegation is configured safely and starting fast
  - operator uses a bounded cleanup surface to remove orphaned stale delegate-server processes without manual `ps` spelunking
  - delegated/subagent runs start normally without the old startup-incomplete warning

## Technical Considerations
- Architectural Notes:
  - `runDelegationSetup` currently plans the wrapper form and only checks config presence plus repo pinning
  - `runDoctor` currently uses `inspectDelegationConfig()` which only verifies that the delegation entry exists in `config.toml`
  - `packageProgramResolver` already distinguishes source/bootstrap/dist execution for other surfaces, but delegation MCP stdio should prefer the fast direct dist path
  - active delegate-server processes currently appear as direct `node .../dist/bin/codex-orchestrator.js delegate-server` children of active `codex` sessions, so stale cleanup must target orphaned chains rather than age alone
- Dependencies / Integrations:
  - `orchestrator/src/cli/delegationSetup.ts`
  - `orchestrator/src/cli/doctor.ts`
  - `orchestrator/src/cli/delegationCliShell.ts`
  - `orchestrator/src/cli/utils/packageProgramResolver.ts`
  - delegation usage docs / README guidance

## Open Questions
- Should the doctor startup probe use the exact configured transport env/args or the CO-planned safe transport when the current config is already known-bad? Current preference: probe the exact configured transport and report the planned remediation separately.
- Should stale cleanup ship as a new `delegation cleanup-stale` surface or stay as doctor-only inspection plus docs? Current preference: add a dry-run-first cleanup surface so remediation is machine-checkable and bounded.

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Pending docs-review child stream for `linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb`
- Design: N/A
