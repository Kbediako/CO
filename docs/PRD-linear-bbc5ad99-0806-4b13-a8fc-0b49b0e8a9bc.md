# PRD - CO STATUS: restore live root control-host Codex session, token, throughput, and 5-hour/weekly rate-limit telemetry after CO-83

## Added by Bootstrap 2026-04-05

## Traceability
- Linear issue: `CO-98` / `bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc`
- Linear URL: https://linear.app/asabeko/issue/CO-98/co-status-restore-live-root-control-host-codex-session-token
- Source issue: `CO-83` / `6e5a9260-4822-453b-ba5b-aa513849e06e`

## Summary
- Problem Statement: `CO-83` improved the status telemetry lane, but the live root control-host path still fails to surface authoritative Codex runtime telemetry during a real active provider-worker run. In root `CO STATUS`, the header `Tokens`, row `TOKENS`, row `SESSION`, `Throughput`, and Codex `Rate Limits` segments for `5-hour` and `weekly` remain absent even while authoritative runtime telemetry should exist.
- Desired Outcome: the live root control-host path becomes truthful end to end. A real active provider-worker run on this device must drive non-empty header `Tokens`, row `TOKENS`, row `SESSION`, `Throughput`, and Codex `5-hour` / `weekly` rate-limit segments in root `CO STATUS`, with focused regressions plus real root-host screenshot proof embedded directly in Linear.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish the follow-up to `CO-83` by repairing the remaining live root control-host telemetry path, not by polishing the workspace proof path or the renderer in isolation. The authoritative runtime data has to reach the root host read-model and terminal surface during an actual provider-worker run.
- Success criteria / acceptance:
  - root live `CO STATUS` header `Tokens` shows truthful non-empty values when authoritative runtime telemetry exists
  - running-row `TOKENS` and `SESSION` show truthful values when authoritative runtime telemetry exists
  - header `Throughput` advances from real token samples when authoritative runtime telemetry exists
  - `Rate Limits` includes truthful Codex `5-hour` and `weekly` segments when authoritative runtime telemetry exists
  - the fix covers runtime parse -> `provider-linear-worker-proof.json` -> root control-host read-model -> terminal rendering
  - tests cover the live root path, not just a workspace proof fixture
  - final validation uses real screenshots from this device against the root local control-host and embeds them directly in Linear
- Constraints / non-goals:
  - no browser `/ui` redesign
  - no attach-viewer redesign
  - no synthetic placeholders or inferred token/session values
  - no workspace-only proof-path fix that leaves the live root host showing `n/a`

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO STATUS`
  - `provider-linear-worker-proof.json`
  - `Tokens`
  - `TOKENS`
  - `SESSION`
  - `Throughput`
  - `Rate Limits`
  - `5-hour`
  - `weekly`
  - `providerLinearWorkerRunner.ts`
  - `compatibilityIssuePresenter.ts`
  - `controlStatusDashboard.ts`
  - `events.jsonl`
  - `CO-83`
- Protected terms / exact artifact and surface names:
  - `CO STATUS`
  - `provider-linear-worker-proof.json`
  - `Tokens`
  - `TOKENS`
  - `SESSION`
  - `Throughput`
  - `Rate Limits`
  - `5-hour`
  - `weekly`
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
- Nearby wrong interpretations to reject:
  - "the operator used the wrong command"
  - "a running row is enough even if token/session/rate-limit fields stay empty"
  - "only Linear rate limits matter at the top line"
  - "the issue is done once a workspace proof screenshot looks correct"
  - "a renderer-only change is sufficient if the root live host still shows `n/a`"

## Parity / Alignment Matrix
- Current truth:
  - the root terminal surface is faithfully rendering its current read-model, but that read-model still lacks truthful live `Tokens`, `TOKENS`, `SESSION`, `Throughput`, and Codex `5-hour` / `weekly` segments during an active provider-worker run
  - `providerLinearWorkerRunner.ts` already persists proof telemetry fields, but the authoritative live root control-host path still drops or fails to prefer some of that data
  - `compatibilityIssuePresenter.ts`, `controlRuntime.ts`, and `controlStatusDashboard.ts` are on the remaining root-host projection/rendering path
- Reference truth:
  - a real active provider-worker run that emits authoritative telemetry should populate token/session/throughput/rate-limit surfaces on the root host without relying on workspace-only proof snapshots
- Target truth / intended delta:
  - root control-host `CO STATUS` shows truthful live token/session/throughput/rate-limit data during an active provider-worker run on this device
- Explicitly out-of-scope differences:
  - broader Symphony parity outside the affected telemetry path
  - unrelated status layout or browser redesign work

## Not Done If
- The root live host still shows `Tokens: in n/a | out n/a | total n/a` during a real active run that emits telemetry.
- Running rows still show `TOKENS n/a` and `SESSION n/a` during a real active run that emits telemetry.
- Only Linear rate limits render while Codex `5-hour` / `weekly` segments remain absent despite authoritative payloads.
- Validation relies on workspace proof frames rather than the root local control-host surface.

## Goals
- Trace the remaining telemetry starvation from runtime event parsing through proof persistence and the root control-host read-model.
- Restore truthful root-host header `Tokens` and `Throughput`.
- Restore truthful running-row `TOKENS` and `SESSION`.
- Surface authoritative Codex `5-hour` and `weekly` rate-limit segments in root `CO STATUS`.
- Prove the fix with focused tests and direct root-host screenshots embedded in the Linear workpad.

## Non-Goals
- Redesigning terminal `CO STATUS` or browser `/ui`.
- Inventing session or token data when the runtime does not emit it.
- Broad provider-worker workflow changes unrelated to the remaining telemetry path.
- Treating workspace proof screenshots as a substitute for root control-host validation.

## Stakeholders
- Product: CO operators relying on root `CO STATUS` for live progress and budget visibility
- Engineering: provider-worker, control-runtime, and terminal status-surface maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - root header `Tokens` and `Throughput` show truthful non-empty values during active usage when telemetry exists
  - running rows show truthful `TOKENS` and `SESSION`
  - Codex `Rate Limits` includes `5-hour` and `weekly` segments when authoritative telemetry exists
  - screenshot proof demonstrates the root local control-host surface, not a workspace-only proof path
- Guardrails / Error Budgets:
  - no fabricated values
  - no regression of existing root-host status rendering when telemetry is absent
  - keep the fix bounded to the telemetry truth path and file a follow-up if a broader seam appears

## User Experience
- Personas: operator monitoring a live provider-worker on the root local control-host; reviewer validating that the live root surface matches authoritative runtime truth
- User Journeys:
  - operator opens root `CO STATUS` during an active worker run and immediately sees truthful token, session, throughput, and Codex rate-limit telemetry
  - reviewer compares proof, tests, and screenshots to confirm the root-host read-model is no longer telemetry-starved

## Technical Considerations
- Architectural Notes:
  - `providerLinearWorkerRunner.ts` is still the authoritative proof writer for runtime event parsing and proof updates
  - the root control-host path depends on the projection/read-model seam in `compatibilityIssuePresenter.ts` and `controlRuntime.ts`
  - `controlStatusDashboard.ts` is the final root terminal renderer and already contains the target columns/labels; this lane is about truthful data reaching it
  - the root live control-host path, not a per-workspace proof snapshot, is the acceptance surface
- Dependencies / Integrations:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - runtime `events.jsonl`

## Open Questions
- Is the remaining drop on the proof-write side, the root control-runtime aggregation side, or the final renderer preference/formatting side?
- Do active provider-worker runs already emit the richer Codex `5-hour` / `weekly` payload shape in the current tree, or does the root host need additional normalization to retain it?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: pending `codex-orchestrator docs-review` child stream for `CO-98`
- Design: N/A
