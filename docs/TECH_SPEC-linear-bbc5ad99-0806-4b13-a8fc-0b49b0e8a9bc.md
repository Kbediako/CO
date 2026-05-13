---
id: 20260405-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc
title: CO STATUS: restore live root control-host Codex session, token, throughput, and 5-hour/weekly rate-limit telemetry after CO-83
relates_to: docs/PRD-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md
risk: high
owners:
  - Codex
last_review: 2026-04-05
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`
- PRD: `docs/PRD-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`
- Task checklist: `tasks/tasks-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`

## Traceability
- Linear issue: `CO-98` / `bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc`
- Linear URL: https://linear.app/asabeko/issue/CO-98/co-status-restore-live-root-control-host-codex-session-token
- Follow-up to: `CO-83` / `6e5a9260-4822-453b-ba5b-aa513849e06e`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: restore authoritative live telemetry on the root local control-host so terminal `CO STATUS` truthfully renders header `Tokens`, row `TOKENS`, row `SESSION`, `Throughput`, and Codex `Rate Limits` segments for `5-hour` and `weekly` during a real active provider-worker run.
- Scope:
  - trace the runtime event parse -> `provider-linear-worker-proof.json` -> root control-runtime -> terminal rendering path
  - repair the smallest remaining telemetry starvation seam affecting the root live host
  - add focused regression coverage for the root path
  - capture root local control-host screenshot proof directly in the Linear workpad
- Constraints:
  - keep the fix on the authoritative truth path, not a workspace-only proof or screenshot fixture path
  - do not fabricate token/session/rate-limit data
  - keep layout changes out of scope unless they are required to surface already-authoritative data

## Technical Requirements
- Functional requirements:
  - root live `CO STATUS` header `Tokens` must render truthful non-empty values when authoritative runtime telemetry exists
  - running rows must render truthful `TOKENS` and `SESSION` values when authoritative runtime telemetry exists
  - root live `Throughput` must advance from real token samples when authoritative runtime telemetry exists
  - root live `Rate Limits` must include authoritative Codex `5-hour` and `weekly` segments when available
  - the fix must cover the end-to-end live path from runtime parse through proof, root read-model, and terminal rendering
  - tests must protect the repaired root-host path, not just fixture-only proof serialization
- Non-functional requirements:
  - preserve current behavior when telemetry is truly absent
  - prefer authoritative live root-host truth over compatibility fallbacks
  - keep throughput deterministic from token totals already accepted by the read-model
- Interfaces / contracts:
  - proof source: `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - projection/read-model: `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`
  - renderer: `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - proof/read-model inputs: runtime `events.jsonl`, `provider-linear-worker-proof.json`, `.runs/local-mcp/cli/control-host/provider-intake-state.json`

## Architecture & Data
- Architecture / design adjustments:
  - identify where the root control-host path still loses or ignores authoritative token/session/rate-limit telemetry after `CO-83`
  - keep proof normalization additive if the remaining issue is payload-shape loss
  - adjust root aggregation/projection preference if the remaining issue is downstream telemetry starvation
  - keep renderer work minimal and only where the root terminal already has the data but is not exposing it
- Data model changes / migrations:
  - no storage migration expected
  - proof or projection payload normalization may need a bounded additive extension for remaining Codex rate-limit window semantics
- External dependencies / integrations:
  - local root control-host runtime and its proof/read-model artifacts
  - active provider-worker runtime `events.jsonl`

## Parity / Alignment Matrix
- Current truth:
  - the root live host still renders `n/a` for token/session/throughput or misses Codex `5-hour` / `weekly` segments during an active run
  - the proof path improved under `CO-83`, but the remaining root-host read-model path still fails to surface the authoritative telemetry all the way through
- Reference truth:
  - a real active provider-worker run emitting telemetry should populate the root host truth surfaces without special casing a workspace-only path
- Target truth / intended delta:
  - the root control-host surface becomes authoritative for the protected `CO STATUS` fields named in `CO-98`
- Explicitly out-of-scope differences:
  - browser `/ui` redesign
  - attach-viewer redesign
  - broad status parity work outside the remaining telemetry path

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused regressions in the affected runtime/projection/dashboard tests
  - required repo validation floor before review handoff
- Rollout verification:
  - run a real active provider-worker on this device
  - confirm the root local control-host surface shows truthful `Tokens`, `TOKENS`, `SESSION`, `Throughput`, and Codex `5-hour` / `weekly`
  - embed screenshots directly in the Linear workpad
- Monitoring / alerts:
  - rely on focused tests plus root-host proof screenshots for this lane; no new monitoring surface is required

## Open Questions
- Is the remaining fault in root proof ingestion, root telemetry aggregation, or terminal formatting preference?
- Which current tests best cover the live root control-host path, and where is the remaining gap that allowed `CO-83` to close early?

## Approvals
- Reviewer: pending `codex-orchestrator docs-review`
- Date: 2026-04-05
- Manifest: pending
- Review telemetry: pending
