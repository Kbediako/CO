# TECH_SPEC - Advanced Capability Autopilot + Usage Signal Hardening (0971)

## Summary
- Objective: implement the approved 5-point behavior upgrade to increase advanced capability usage with low-friction, agent-first defaults.
- Scope:
  - `orchestrator/src/cli/orchestrator.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `orchestrator/src/utils/executionMode.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `orchestrator/src/cli/doctorUsage.ts`
  - `orchestrator/src/cli/services/runSummaryWriter.ts`
  - `bin/codex-orchestrator.ts`
  - related tests/schemas/types.
- Constraints:
  - Keep behavior additive and backward-compatible where practical.
  - Keep scout bounded and non-blocking.
  - Preserve explicit operator override paths.
  - Collab lifecycle diagnostics should be inferred conservatively from existing collab event schema (no fragile log scraping assumptions).

## Design

### 1) `advanced-mode=auto` policy behavior
- Interpret `auto` as context-aware enablement:
  - enable advanced routing signals for non-trivial pipelines and clearly surface status/reason.
  - do not force all advanced actions in every run.
- Expose mode reason in summary/run metadata for observability.

### 2) Auto scout stage (non-blocking)
- For `docs-review` and `implementation-gate`, inject a lightweight scout stage early.
- Scout outputs evidence pointers when available.
- Timeout/failure path:
  - write warning + reason
  - continue main pipeline execution.

### 3) Structured cloud fallback reason wiring
- Add explicit optional cloud fallback field(s) in manifest cloud execution structure.
- Populate when cloud preflight fails and MCP fallback is used.
- Preserve summary append behavior for compatibility, but prefer structured field for tooling.

### 4) RLM auto => large-context-only default
- Tighten auto symbolic activation criteria so auto symbolic only triggers when:
  - context bytes meet threshold, and
  - context source signal indicates true large-context workflow (for example explicit context path/metadata).
- Preserve explicit symbolic override behavior.

### 5) KPI surfacing in `doctor --usage` and run-summary
- Extend formatted usage output with key adoption metrics and ratios.
- Write core KPI snapshot into run-summary output to support quick trend monitoring.
- Keep JSON output machine-friendly.

### 6) Collab lifecycle hygiene diagnostics (follow-up)
- Extend `doctor --usage` collab aggregation with additive lifecycle indicators:
  - runs containing likely unclosed spawned agents.
  - total likely unclosed spawned agents.
  - runs containing likely failed spawn attempts (`spawn_agent` status `failed`).
  - total likely failed spawn attempts.
- Maintain backward compatibility:
  - additive fields only.
  - existing counters and summary line semantics remain intact.
- Summary formatting:
  - append lifecycle indicators to the collab line in concise form.
  - keep wording explicit that thread-limit classification is likely/inferred.

### 7) Shipped skill close-sweep pattern (follow-up)
- Update shipped skills to require explicit lifecycle ledgering:
  - track open agent ids from successful spawns.
  - close-sweep all open ids before handoff and on thread-limit errors.
- Keep instructions minimal and deterministic to reduce agent friction.

## Validation
- Automated:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
- Targeted tests:
  - orchestrator routing and scout behavior tests.
  - cloud fallback field population/output tests.
  - RLM auto resolution threshold tests.
  - doctor usage + run-summary KPI formatting tests.

## Open Questions
- None blocking; compatibility handled via additive fields and fallback text retention.
