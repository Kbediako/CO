---
id: 20260413-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb
title: CO fix delegation MCP startup perf and stale delegate-server process lifecycle
relates_to: docs/PRD-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md
risk: high
owners:
  - Codex
last_review: 2026-04-13
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`
- PRD: `docs/PRD-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`
- Task checklist: `tasks/tasks-linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb.md`

## Traceability
- Linear issue: `CO-168` / `e1c9b7e2-b142-465e-972d-b9b280cb6cdb`
- Linear URL: https://linear.app/asabeko/issue/CO-168/co-fix-delegation-mcp-startupperf-and-stale-delegate-server-process
- Docs-review fallback note: `out/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/manual/20260413T055822Z-docs-review-fallback.md`

## Summary
- Objective: make delegation MCP setup, doctor, and recovery tooling agree on a fast direct transport and add bounded stale-process observability/remediation.
- Scope:
  - delegation setup/readiness command planning and parsing
  - doctor delegation command classification plus initialize probe
  - orphaned delegate-server process inspection and cleanup
  - focused docs/tests for the new contract
- Constraints:
  - keep delegation guard unchanged
  - do not broaden into generic control-host/process ownership work
  - preserve safe handling for actively parented delegate-server processes

## Issue-Shaping Contract
- User-request translation carried forward: delegation MCP should stop advertising or preferring the slow wrapper form, doctor should prove command safety plus startup behavior, and stale delegate-server leftovers should be inspectable and cleanable through CO-owned tooling.
- Protected terms / exact artifact and surface names:
  - `delegation`
  - `delegate-server`
  - `codex mcp get delegation`
  - `codex-orchestrator doctor`
  - `codex-orchestrator delegation setup`
  - `CO-164`
  - `CO-165`
- Nearby wrong interpretations to reject:
  - "config exists" is enough health signal
  - any old process with `delegate-server` in args is safe to kill
  - broad control-host orphan cleanup belongs in this lane
- Explicit non-goals carried forward:
  - delegation-guard changes
  - provider admission/control-host refactors outside delegation MCP lifecycle health
  - source-authority redesign for unrelated surfaces

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth:
  - delegation setup plans the wrapper form, which triage showed can take about 3s to answer `initialize`
  - doctor only checks for a delegation config entry and still recommends the wrapper form
  - live config may already point at the direct dist entrypoint, so setup/readiness and doctor can disagree with working reality
  - active delegate-server processes can be legitimate children of live `codex` sessions
- Reference truth:
  - delegation MCP stdio should use a direct command that answers `initialize` within the normal startup window
  - doctor should expose both startup safety and stale orphan posture
  - cleanup should target orphaned stale chains, not active delegate-server children
- Target truth / intended delta:
  - setup/readiness/manual guidance use the direct dist entrypoint for delegation MCP stdio
  - doctor surfaces configured command kind, initialize probe latency/status, and orphaned stale-process findings
  - cleanup/remediation is available through a CO-owned dry-run/apply surface
- Explicitly out-of-scope differences:
  - full process-supervision redesign
  - unrelated provider-worker workflow/prompt changes

## Readiness Gate
- Not done if:
  - the planned/manual setup command still uses `codex-orchestrator delegate-server`
  - doctor still marks delegation healthy without command or startup validation
  - cleanup cannot distinguish active delegate-server parents from orphaned leftovers
- Pre-implementation issue-quality review evidence:
  - live `delegation setup --format json` still plans the wrapper form
  - live `codex mcp get delegation --json` shows a direct `node .../dist/bin/codex-orchestrator.js delegate-server` transport
  - live process inspection shows current delegate-server instances parented by active `codex` sessions, proving age-only cleanup would be too broad
- Safeguard ownership split:
  - this lane owns delegation MCP setup/doctor/lifecycle observability
  - broader `CO-164` / `CO-165` lifecycle work stays external unless a concrete bounded follow-up is required

## Technical Requirements
- Functional requirements:
  - delegation setup must plan/apply a direct dist-backed delegation transport for MCP stdio
  - readiness detection must recognize both safe direct command configuration and repo-pinning posture truthfully
  - doctor must report the configured delegation command and whether it is MCP-safe
  - doctor must run or otherwise record an initialize/handshake probe with bounded latency expectations
  - doctor must inspect delegate-server process posture and distinguish active-parented processes from orphaned stale chains
  - CO must expose a bounded cleanup/remediation path for orphaned stale chains
  - operator-facing docs must explain the recovery path without manual process-table inspection
- Non-functional requirements (performance, reliability, security):
  - probing must fail closed quickly and avoid hanging doctor indefinitely
  - cleanup must default to dry-run and only target orphaned stale candidates by explicit apply
  - setup/doctor must preserve existing delegation env overrides rather than discarding them
- Interfaces / contracts:
  - `codex-orchestrator delegation setup [--yes]`
  - `codex-orchestrator doctor`
  - `codex-orchestrator delegation cleanup-stale [--yes]`
  - `codex mcp get delegation --json`

## Architecture & Data
- Architecture / design adjustments:
  - add a shared delegation MCP transport inspector that reads `codex mcp get delegation --json`, classifies command kind, and preserves existing env overrides
  - make delegation setup use a direct `node <dist/bin/codex-orchestrator.js> delegate-server` transport instead of the wrapper form
  - extend doctor delegation reporting with command classification, initialize probe telemetry, and orphaned stale-process posture
  - add a bounded cleanup shell that enumerates delegate-server chains from `ps`, keeps active parented chains out of scope, and terminates orphaned stale candidates only on explicit apply
- Data model changes / migrations:
  - none; this is CLI health/inspection state only
- External dependencies / integrations:
  - Codex CLI `mcp get delegation --json`
  - local `ps` process inspection on supported Unix hosts
  - existing packaged `dist/bin/codex-orchestrator.js` artifact

## Validation Plan
- Tests / checks:
  - audited `docs-review` child stream after packet registration
  - focused Vitest coverage for delegation setup planning/readiness classification
  - focused doctor coverage for safe command reporting, startup probe classification, and stale-process reporting
  - focused cleanup-shell coverage for orphaned-vs-active delegate-server processes
  - targeted live checks: `codex mcp get delegation --json`, `codex-orchestrator delegation setup --format json`, `codex-orchestrator doctor`
  - final repo validation floor for the landed diff
- Rollout verification:
  - verify doctor reports the actual configured command kind and a successful fast initialize probe on the live direct dist transport
  - verify cleanup dry-run reports only orphaned stale candidates when simulated coverage is used
  - refresh the single Linear workpad after docs, implementation, validation, and handoff
- Monitoring / alerts:
  - use doctor text/json output as the operator-facing inspection surface
  - preserve manual fallback notes under `out/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/manual/` if any bounded review/probe step stalls

## Open Questions
- Whether `ps` inspection should remain Unix-only with a clear unavailable status on unsupported hosts or grow a Windows path now. Current preference: Unix-only with explicit unavailable messaging because the issue evidence and active host are macOS.

## Approvals
- Reviewer: `codex-orchestrator docs-review (direct fallback after provider provenance boundary)`
- Date: 2026-04-13
- Evidence: `.runs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/cli/2026-04-13T05-44-46-601Z-d94802bb/provider-linear-worker-linear-audit.jsonl`, `out/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/manual/20260413T055822Z-docs-review-fallback.md`
